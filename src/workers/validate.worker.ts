import { Job, Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { decisionLogs, ingestions, schemas } from "../db/schema.js";
import { parseCSV } from "../services/csv-parser.js";
import { getFilePath } from "../services/storage.js";
import type {
  CanonicalSchema,
  CellError,
  ColumnDefinition,
  ColumnType,
  MappingResult,
  RowError,
  ValidationResult,
  Validator,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { QUEUE_NAMES, outputQueue, redis, type ValidateJobData } from "./queues.js";

const log = logger.child({ worker: "validate" });

// =============================================================================
// TYPE COERCION UTILITIES
// =============================================================================

function coerceValue(
  value: unknown,
  targetType: ColumnType,
  columnDef: ColumnDefinition
): { success: boolean; value: unknown; error?: string } {
  if (value === null || value === undefined || value === "") {
    if (columnDef.nullable) {
      return { success: true, value: null };
    }
    if (columnDef.default !== undefined) {
      return { success: true, value: columnDef.default };
    }
    if (columnDef.required) {
      return { success: false, value: null, error: "Required value is missing" };
    }
    return { success: true, value: null };
  }

  const str = String(value).trim();

  switch (targetType) {
    case "string":
      return { success: true, value: str };

    case "integer": {
      const num = parseInt(str, 10);
      if (isNaN(num)) {
        return { success: false, value, error: `Cannot parse "${str}" as integer` };
      }
      return { success: true, value: num };
    }

    case "float": {
      const num = parseFloat(str);
      if (isNaN(num)) {
        return { success: false, value, error: `Cannot parse "${str}" as float` };
      }
      return { success: true, value: num };
    }

    case "boolean": {
      const lower = str.toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(lower)) {
        return { success: true, value: true };
      }
      if (["false", "0", "no", "n", "off"].includes(lower)) {
        return { success: true, value: false };
      }
      return { success: false, value, error: `Cannot parse "${str}" as boolean` };
    }

    case "date":
    case "datetime": {
      // Try to parse date with explicit format handling
      // Note: columnDef.coerceFormats available for future custom format support
      let parsedDate: Date | null = null;

      // Try ISO format first (most reliable)
      const isoDateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoDateMatch) {
        const isoDate = new Date(str);
        if (!isNaN(isoDate.getTime())) {
          parsedDate = isoDate;
        }
      }

      if (!parsedDate) {
        // Try YYYY/MM/DD format
        const ymdMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (ymdMatch) {
          const [, year, month, day] = ymdMatch;
          const testDate = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
          if (!isNaN(testDate.getTime())) {
            parsedDate = testDate;
          }
        }
      }

      if (!parsedDate) {
        // Try MM/DD/YYYY format (US format - explicit assumption)
        const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mdyMatch) {
          const [, month, day, year] = mdyMatch;
          const testDate = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
          if (!isNaN(testDate.getTime())) {
            parsedDate = testDate;
          }
        }
      }

      if (!parsedDate) {
        // Try MM-DD-YYYY format
        const mdyDashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (mdyDashMatch) {
          const [, month, day, year] = mdyDashMatch;
          const testDate = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
          if (!isNaN(testDate.getTime())) {
            parsedDate = testDate;
          }
        }
      }

      if (parsedDate) {
        return {
          success: true,
          value: targetType === "date"
            ? parsedDate.toISOString().split("T")[0]
            : parsedDate.toISOString(),
        };
      }

      return { success: false, value, error: `Cannot parse "${str}" as ${targetType}` };
    }

    case "email": {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(str)) {
        return { success: true, value: str.toLowerCase() };
      }
      return { success: false, value, error: `"${str}" is not a valid email` };
    }

    case "uuid": {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(str)) {
        return { success: true, value: str.toLowerCase() };
      }
      return { success: false, value, error: `"${str}" is not a valid UUID` };
    }

    case "url": {
      try {
        new URL(str);
        return { success: true, value: str };
      } catch {
        return { success: false, value, error: `"${str}" is not a valid URL` };
      }
    }

    case "json": {
      try {
        const parsed = JSON.parse(str);
        return { success: true, value: parsed };
      } catch {
        return { success: false, value, error: `"${str}" is not valid JSON` };
      }
    }

    default:
      return { success: true, value: str };
  }
}

// =============================================================================
// VALIDATOR EXECUTION
// =============================================================================

function runValidator(
  value: unknown,
  validator: Validator,
  _columnDef: ColumnDefinition
): { valid: boolean; message?: string } {
  if (value === null || value === undefined) {
    return { valid: true }; // Null values are handled separately
  }

  switch (validator.type) {
    case "regex": {
      const regex = new RegExp(validator.pattern);
      const str = String(value);
      if (!regex.test(str)) {
        return {
          valid: false,
          message: validator.message || `Value does not match pattern: ${validator.pattern}`,
        };
      }
      return { valid: true };
    }

    case "min": {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(num) || num < validator.value) {
        return {
          valid: false,
          message: validator.message || `Value must be at least ${validator.value}`,
        };
      }
      return { valid: true };
    }

    case "max": {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(num) || num > validator.value) {
        return {
          valid: false,
          message: validator.message || `Value must be at most ${validator.value}`,
        };
      }
      return { valid: true };
    }

    case "minLength": {
      const str = String(value);
      if (str.length < validator.value) {
        return {
          valid: false,
          message: validator.message || `Value must be at least ${validator.value} characters`,
        };
      }
      return { valid: true };
    }

    case "maxLength": {
      const str = String(value);
      if (str.length > validator.value) {
        return {
          valid: false,
          message: validator.message || `Value must be at most ${validator.value} characters`,
        };
      }
      return { valid: true };
    }

    case "enum": {
      const str = String(value);
      if (!validator.values.includes(str)) {
        return {
          valid: false,
          message: validator.message || `Value must be one of: ${validator.values.join(", ")}`,
        };
      }
      return { valid: true };
    }

    case "unique":
      // Unique validation is handled separately at the full dataset level
      return { valid: true };

    default:
      return { valid: true };
  }
}

// =============================================================================
// MAIN VALIDATION LOGIC
// =============================================================================

interface ValidatedRow {
  data: Record<string, unknown>;
  errors: CellError[];
  action: "accepted" | "rejected" | "flagged" | "coerced";
}

function validateRow(
  row: Record<string, unknown>,
  rowNumber: number,
  mappingResult: MappingResult,
  canonicalSchema: CanonicalSchema | null,
  seenValues: Map<string, Set<unknown>>
): ValidatedRow {
  const mappedData: Record<string, unknown> = {};
  const errors: CellError[] = [];
  let hasError = false;

  // Build a map of target column -> source column for quick lookup
  const targetToSource = new Map<string, string>();
  for (const mapping of mappingResult.mappings) {
    if (mapping.targetColumn) {
      targetToSource.set(mapping.targetColumn, mapping.sourceColumn);
    }
  }

  // If we have a canonical schema, validate against it
  if (canonicalSchema) {
    for (const colDef of canonicalSchema.columns) {
      const sourceColumn = targetToSource.get(colDef.name);
      const rawValue = sourceColumn ? row[sourceColumn] : undefined;

      // Check required
      if (colDef.required && (rawValue === null || rawValue === undefined || rawValue === "")) {
        errors.push({
          row: rowNumber,
          column: colDef.name,
          value: rawValue,
          expectedType: colDef.type,
          errorType: "required_missing",
          message: `Required column "${colDef.name}" is missing or empty`,
        });
        hasError = true;

        // Apply default if available
        if (colDef.default !== undefined) {
          mappedData[colDef.name] = colDef.default;
        } else {
          mappedData[colDef.name] = null;
        }
        continue;
      }

      // Type coercion
      const coercion = coerceValue(rawValue, colDef.type, colDef);
      if (!coercion.success) {
        errors.push({
          row: rowNumber,
          column: colDef.name,
          value: rawValue,
          expectedType: colDef.type,
          errorType: "type_coercion",
          message: coercion.error || `Failed to coerce to ${colDef.type}`,
        });
        hasError = true;

        // Apply default if available
        if (colDef.default !== undefined) {
          mappedData[colDef.name] = colDef.default;
        } else {
          mappedData[colDef.name] = rawValue; // Keep original for flagging
        }
        continue;
      }

      const coercedValue = coercion.value;

      // Run validators
      for (const validator of colDef.validators) {
        if (validator.type === "unique") {
          // Track for uniqueness check
          if (!seenValues.has(colDef.name)) {
            seenValues.set(colDef.name, new Set());
          }
          const seen = seenValues.get(colDef.name)!;
          if (coercedValue !== null && seen.has(coercedValue)) {
            errors.push({
              row: rowNumber,
              column: colDef.name,
              value: coercedValue,
              expectedType: colDef.type,
              errorType: "validation_failed",
              message: validator.message || "Value must be unique",
              validatorType: "unique",
            });
            hasError = true;
          } else if (coercedValue !== null) {
            seen.add(coercedValue);
          }
        } else {
          const validationResult = runValidator(coercedValue, validator, colDef);
          if (!validationResult.valid) {
            errors.push({
              row: rowNumber,
              column: colDef.name,
              value: coercedValue,
              expectedType: colDef.type,
              errorType: "validation_failed",
              message: validationResult.message || "Validation failed",
              validatorType: validator.type,
            });
            hasError = true;
          }
        }
      }

      mappedData[colDef.name] = coercedValue;
    }
  } else {
    // No canonical schema - just apply the mapping (passthrough)
    for (const mapping of mappingResult.mappings) {
      if (mapping.targetColumn) {
        mappedData[mapping.targetColumn] = row[mapping.sourceColumn];
      }
    }
  }

  // Determine action based on errors
  let action: ValidatedRow["action"] = "accepted";
  if (hasError) {
    action = "flagged"; // Default to flagging
  }

  return { data: mappedData, errors, action };
}

async function processValidateJob(job: Job<ValidateJobData>): Promise<void> {
  const { ingestionId } = job.data;

  log.info({ ingestionId }, "Starting validate job");

  // Update status to validating
  await db
    .update(ingestions)
    .set({ status: "validating", updatedAt: new Date() })
    .where(eq(ingestions.id, ingestionId));

  try {
    // Clear any existing decision logs for this stage (idempotency for retries)
    await db
      .delete(decisionLogs)
      .where(
        and(
          eq(decisionLogs.ingestionId, ingestionId),
          eq(decisionLogs.stage, "validate")
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

    // Get canonical schema if we have a schemaId
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

    // Get file path and re-parse CSV (we need all rows now, not just samples)
    // NOTE: For large files, consider streaming or persisting validated data to avoid
    // re-parsing in the output stage. Current architecture prioritizes simplicity.
    const filePath = await getFilePath(ingestion.rawFileKey);
    const parseResult = await parseCSV(filePath, { sampleSize: Infinity });

    // Validate all rows
    const rowErrors: RowError[] = [];
    const errorsByColumn: Record<string, number> = {};
    const seenValues = new Map<string, Set<unknown>>(); // For uniqueness tracking

    let validRowCount = 0;
    let invalidRowCount = 0;

    const errorPolicy = canonicalSchema?.errorPolicy || "flag";

    for (let i = 0; i < parseResult.rows.length; i++) {
      const row = parseResult.rows[i]!;
      const rowNumber = i + 1; // 1-indexed for human readability

      const validationResult = validateRow(
        row,
        rowNumber,
        ingestion.mappingResult!,
        canonicalSchema,
        seenValues
      );

      if (validationResult.errors.length > 0) {
        invalidRowCount++;

        // Track errors by column
        for (const error of validationResult.errors) {
          errorsByColumn[error.column] = (errorsByColumn[error.column] || 0) + 1;
        }

        // Apply error policy
        let action: RowError["action"] = "flagged";

        switch (errorPolicy) {
          case "reject_row":
            action = "rejected";
            break;
          case "flag":
            action = "flagged";
            break;
          case "coerce_default":
            action = "coerced";
            break;
          case "abort":
            throw new Error(
              `Validation aborted due to error in row ${rowNumber}: ${validationResult.errors[0]?.message || "Unknown error"}`
            );
        }

        rowErrors.push({
          row: rowNumber,
          errors: validationResult.errors,
          action,
        });
      } else {
        validRowCount++;
      }
    }

    const validationResult: ValidationResult = {
      validRowCount,
      invalidRowCount,
      errors: rowErrors,
      errorsByColumn,
    };

    log.info(
      {
        ingestionId,
        validRowCount,
        invalidRowCount,
        errorCount: rowErrors.length,
      },
      "Validation complete"
    );

    // Log decision
    await db.insert(decisionLogs).values({
      ingestionId,
      stage: "validate",
      decisionType: "validation_complete",
      details: {
        validRowCount,
        invalidRowCount,
        errorsByColumn,
        errorPolicy,
        sampleErrors: rowErrors.slice(0, 10), // Log first 10 errors as sample
      },
    });

    // Update ingestion with validation result
    await db
      .update(ingestions)
      .set({
        validationResult,
        validRowCount,
        status: "outputting",
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    // Trigger output stage
    await outputQueue.add(
      `output-${ingestionId}`,
      { ingestionId },
      { jobId: `output-${ingestionId}` }
    );
  } catch (error) {
    log.error({ ingestionId, error }, "Validate job failed");

    await db
      .update(ingestions)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown validate error",
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    throw error;
  }
}

export const validateWorker = new Worker<ValidateJobData>(
  QUEUE_NAMES.VALIDATE,
  processValidateJob,
  {
    connection: redis,
    concurrency: 3, // Lower concurrency for memory-intensive validation
  }
);

validateWorker.on("completed", (job) => {
  log.info(
    { jobId: job.id, ingestionId: job.data.ingestionId },
    "Validate job completed"
  );
});

validateWorker.on("failed", (job, error) => {
  log.error({ jobId: job?.id, error }, "Validate job failed");
});
