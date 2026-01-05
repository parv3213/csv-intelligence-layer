import { Job, Worker } from "bullmq";
import { stringify } from "csv-stringify/sync";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { decisionLogs, ingestions, schemas } from "../db/schema.js";
import { parseCSV } from "../services/csv-parser.js";
import {
  generateOutputFileKey,
  getFilePath,
  saveFile,
} from "../services/storage.js";
import type {
  CanonicalSchema,
  ColumnDefinition,
  ColumnType,
  MappingResult,
  RowError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { QUEUE_NAMES, redis, type OutputJobData } from "./queues.js";

const log = logger.child({ worker: "output" });

// =============================================================================
// VALUE COERCION (simplified from validate worker)
// =============================================================================

function coerceForOutput(
  value: unknown,
  targetType: ColumnType,
  colDef: ColumnDefinition
): unknown {
  if (value === null || value === undefined || value === "") {
    if (colDef.default !== undefined) {
      return colDef.default;
    }
    return null;
  }

  const str = String(value).trim();

  switch (targetType) {
    case "integer": {
      const num = parseInt(str, 10);
      return isNaN(num) ? null : num;
    }

    case "float": {
      const num = parseFloat(str);
      return isNaN(num) ? null : num;
    }

    case "boolean": {
      const lower = str.toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(lower)) return true;
      if (["false", "0", "no", "n", "off"].includes(lower)) return false;
      return null;
    }

    case "date": {
      const date = new Date(str);
      return isNaN(date.getTime()) ? str : date.toISOString().split("T")[0];
    }

    case "datetime": {
      const date = new Date(str);
      return isNaN(date.getTime()) ? str : date.toISOString();
    }

    case "email":
      return str.toLowerCase();

    case "uuid":
      return str.toLowerCase();

    default:
      return str;
  }
}

// =============================================================================
// ROW TRANSFORMATION
// =============================================================================

function transformRow(
  row: Record<string, unknown>,
  mappingResult: MappingResult,
  canonicalSchema: CanonicalSchema | null,
  rejectedRows: Set<number>,
  rowError: RowError | undefined,
  rowNumber: number
): Record<string, unknown> | null {
  // Skip rejected rows
  if (rejectedRows.has(rowNumber)) {
    return null;
  }

  const mappedData: Record<string, unknown> = {};

  // Build target->source map
  const targetToSource = new Map<string, string>();
  for (const mapping of mappingResult.mappings) {
    if (mapping.targetColumn) {
      targetToSource.set(mapping.targetColumn, mapping.sourceColumn);
    }
  }

  if (canonicalSchema) {
    const errorCols = new Set(rowError?.errors.map((e) => e.column) || []);
    const isCoerced = rowError?.action === "coerced";

    // Apply schema-based transformation
    for (const colDef of canonicalSchema.columns) {
      const sourceColumn = targetToSource.get(colDef.name);
      const rawValue = sourceColumn ? row[sourceColumn] : undefined;

      if (
        isCoerced &&
        errorCols.has(colDef.name) &&
        colDef.default !== undefined
      ) {
        mappedData[colDef.name] = colDef.default;
      } else {
        mappedData[colDef.name] = coerceForOutput(
          rawValue,
          colDef.type,
          colDef
        );
      }
    }
  } else {
    // Passthrough mapping
    for (const mapping of mappingResult.mappings) {
      if (mapping.targetColumn) {
        mappedData[mapping.targetColumn] = row[mapping.sourceColumn];
      }
    }
  }

  return mappedData;
}

// =============================================================================
// OUTPUT GENERATION
// =============================================================================

async function processOutputJob(job: Job<OutputJobData>): Promise<void> {
  const { ingestionId } = job.data;

  log.info({ ingestionId }, "Starting output job");

  // Update status to outputting
  await db
    .update(ingestions)
    .set({ status: "outputting", updatedAt: new Date() })
    .where(eq(ingestions.id, ingestionId));

  try {
    // Clear any existing decision logs for this stage (idempotency for retries)
    await db
      .delete(decisionLogs)
      .where(
        and(
          eq(decisionLogs.ingestionId, ingestionId),
          eq(decisionLogs.stage, "output")
        )
      );

    // Get ingestion record
    const [ingestion] = await db
      .select()
      .from(ingestions)
      .where(eq(ingestions.id, ingestionId))
      .limit(1);

    if (!ingestion) {
      throw new Error(`Ingestion not found: ${ingestionId}`);
    }

    if (!ingestion.mappingResult) {
      throw new Error(`Mapping result not found for ingestion: ${ingestionId}`);
    }

    // Get canonical schema if available
    let canonicalSchema: CanonicalSchema | null = null;
    if (ingestion.schemaId) {
      const [schemaRow] = await db
        .select()
        .from(schemas)
        .where(eq(schemas.id, ingestion.schemaId))
        .limit(1);

      if (schemaRow) {
        canonicalSchema = schemaRow.definition;
      }
    }

    // Get all decision logs for this ingestion
    const decisions = await db
      .select()
      .from(decisionLogs)
      .where(eq(decisionLogs.ingestionId, ingestionId))
      .orderBy(decisionLogs.createdAt);

    // Build set of rejected rows from validation result
    const rejectedRows = new Set<number>();
    const rowErrorsMap = new Map<number, RowError>();
    if (ingestion.validationResult) {
      for (const rowError of ingestion.validationResult.errors) {
        rowErrorsMap.set(rowError.row, rowError);
        if (rowError.action === "rejected") {
          rejectedRows.add(rowError.row);
        }
      }
    }

    // Re-parse CSV and transform rows
    // NOTE: For large files, consider streaming or consuming validated data from previous
    // stage to avoid re-parsing. Current architecture prioritizes simplicity over memory efficiency.
    const filePath = await getFilePath(ingestion.rawFileKey);
    const parseResult = await parseCSV(filePath, { sampleSize: Infinity });

    const outputRows: Record<string, unknown>[] = [];

    for (let i = 0; i < parseResult.rows.length; i++) {
      const rowNumber = i + 1;
      const rowError = rowErrorsMap.get(rowNumber);
      const transformedRow = transformRow(
        parseResult.rows[i]!,
        ingestion.mappingResult!,
        canonicalSchema,
        rejectedRows,
        rowError,
        rowNumber
      );

      if (transformedRow !== null) {
        outputRows.push(transformedRow);
      }
    }

    // Determine output columns
    const outputColumns = canonicalSchema
      ? canonicalSchema.columns.map((c) => c.name)
      : ingestion.mappingResult.mappings
          .filter((m) => m.targetColumn)
          .map((m) => m.targetColumn as string);

    // Generate CSV output
    const csvOutput = stringify(outputRows, {
      header: true,
      columns: outputColumns,
    });

    // Save clean CSV
    const csvKey = generateOutputFileKey(ingestionId, "csv");
    await saveFile(csvKey, Buffer.from(csvOutput, "utf-8"));

    // Generate and save JSON output
    const jsonOutput = JSON.stringify(
      {
        metadata: {
          ingestionId,
          schemaId: ingestion.schemaId,
          schemaName: canonicalSchema?.name,
          schemaVersion: canonicalSchema?.version,
          processedAt: new Date().toISOString(),
          totalRows: parseResult.totalRowCount,
          outputRows: outputRows.length,
          rejectedRows: rejectedRows.size,
        },
        columns: outputColumns,
        data: outputRows,
      },
      null,
      2
    );
    const jsonKey = generateOutputFileKey(ingestionId, "json");
    await saveFile(jsonKey, Buffer.from(jsonOutput, "utf-8"));

    // Generate and save errors report
    const errorsOutput = JSON.stringify(
      {
        ingestionId,
        validationResult: ingestion.validationResult,
        errorsByColumn: ingestion.validationResult?.errorsByColumn || {},
        errors: ingestion.validationResult?.errors || [],
      },
      null,
      2
    );
    const errorsKey = `output/${ingestionId}/errors.json`;
    await saveFile(errorsKey, Buffer.from(errorsOutput, "utf-8"));

    // Generate and save decision log
    const decisionsOutput = JSON.stringify(
      {
        ingestionId,
        decisions: decisions.map((d) => ({
          stage: d.stage,
          decisionType: d.decisionType,
          details: d.details,
          timestamp: d.createdAt,
        })),
      },
      null,
      2
    );
    const decisionsKey = `output/${ingestionId}/decisions.json`;
    await saveFile(decisionsKey, Buffer.from(decisionsOutput, "utf-8"));

    // Generate and save schema artifact
    const schemaArtifact = JSON.stringify(
      {
        canonical: canonicalSchema,
        inferred: ingestion.inferredSchema,
        mappings: ingestion.mappingResult.mappings,
      },
      null,
      2
    );
    const schemaKey = `output/${ingestionId}/schema.json`;
    await saveFile(schemaKey, Buffer.from(schemaArtifact, "utf-8"));

    log.info(
      {
        ingestionId,
        outputRows: outputRows.length,
        rejectedRows: rejectedRows.size,
        csvKey,
        jsonKey,
      },
      "Output generation complete"
    );

    // Log decision
    await db.insert(decisionLogs).values({
      ingestionId,
      stage: "output",
      decisionType: "output_complete",
      details: {
        csvKey,
        jsonKey,
        errorsKey,
        decisionsKey,
        schemaKey,
        outputRowCount: outputRows.length,
        rejectedRowCount: rejectedRows.size,
      },
    });

    // Update ingestion as complete
    await db
      .update(ingestions)
      .set({
        outputFileKey: csvKey,
        status: "complete",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));
  } catch (error) {
    log.error({ ingestionId, error }, "Output job failed");

    await db
      .update(ingestions)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown output error",
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    throw error;
  }
}

export const outputWorker = new Worker<OutputJobData>(
  QUEUE_NAMES.OUTPUT,
  processOutputJob,
  {
    connection: redis,
    concurrency: 3,
  }
);

outputWorker.on("completed", (job) => {
  log.info(
    { jobId: job.id, ingestionId: job.data.ingestionId },
    "Output job completed"
  );
});

outputWorker.on("failed", (job, error) => {
  log.error({ jobId: job?.id, error }, "Output job failed");
});
