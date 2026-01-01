import { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { decisionLogs, ingestions, schemas } from "../db/schema.js";
import { applyHumanDecisions, mapColumns } from "../services/column-mapping.js";
import type { MappingResult } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { QUEUE_NAMES, redis, validateQueue, type MapJobData } from "./queues.js";

const log = logger.child({ worker: "map" });

async function processMapJob(job: Job<MapJobData>): Promise<void> {
  const { ingestionId, schemaId, resumeWithDecisions } = job.data;

  log.info({ ingestionId, schemaId, hasDecisions: !!resumeWithDecisions }, "Starting map job");

  // Update status to mapping
  await db
    .update(ingestions)
    .set({ status: "mapping", updatedAt: new Date() })
    .where(eq(ingestions.id, ingestionId));

  try {
    // Get ingestion record
    const [ingestion] = await db
      .select()
      .from(ingestions)
      .where(eq(ingestions.id, ingestionId))
      .limit(1);

    if (!ingestion) {
      throw new Error(`Ingestion not found: ${ingestionId}`);
    }

    if (!ingestion.inferredSchema) {
      throw new Error(`Inferred schema not found for ingestion: ${ingestionId}`);
    }

    let mappingResult: MappingResult;

    // If no schemaId, create a passthrough mapping (all columns map to themselves)
    if (!schemaId) {
      log.info({ ingestionId }, "No schema provided, creating passthrough mapping");

      mappingResult = {
        mappings: ingestion.inferredSchema.columns.map((col) => ({
          sourceColumn: col.name,
          targetColumn: col.name,
          method: "exact" as const,
          confidence: 1.0,
        })),
        requiresReview: false,
        ambiguousMappings: [],
      };

      // Log decision
      await db.insert(decisionLogs).values({
        ingestionId,
        stage: "map",
        decisionType: "passthrough_mapping",
        details: {
          reason: "No canonical schema provided",
          mappingCount: mappingResult.mappings.length,
        },
      });
    } else {
      // Get canonical schema
      const [schemaRow] = await db
        .select()
        .from(schemas)
        .where(eq(schemas.id, schemaId))
        .limit(1);

      if (!schemaRow) {
        throw new Error(`Schema not found: ${schemaId}`);
      }

      const canonicalSchema = schemaRow.definition;

      // Check if we're resuming with human decisions
      if (resumeWithDecisions && ingestion.mappingResult) {
        // Apply human decisions to existing mapping
        mappingResult = applyHumanDecisions(
          ingestion.mappingResult,
          resumeWithDecisions
        );

        log.info(
          {
            ingestionId,
            decisionsApplied: resumeWithDecisions.length,
          },
          "Applied human decisions to mapping"
        );

        // Log each human decision
        for (const decision of resumeWithDecisions) {
          await db.insert(decisionLogs).values({
            ingestionId,
            stage: "map",
            decisionType: "human_resolved",
            details: {
              sourceColumn: decision.sourceColumn,
              targetColumn: decision.targetColumn,
              resolvedBy: "human",
            },
          });
        }
      } else {
        // Perform initial column mapping
        mappingResult = mapColumns({
          inferredSchema: ingestion.inferredSchema,
          canonicalSchema,
        });

        log.info(
          {
            ingestionId,
            mappings: mappingResult.mappings.length,
            requiresReview: mappingResult.requiresReview,
            ambiguousCount: mappingResult.ambiguousMappings.length,
          },
          "Column mapping complete"
        );

        // Log each mapping decision
        for (const mapping of mappingResult.mappings) {
          await db.insert(decisionLogs).values({
            ingestionId,
            stage: "map",
            decisionType: mapping.targetColumn ? "column_mapped" : "column_unmapped",
            details: {
              sourceColumn: mapping.sourceColumn,
              targetColumn: mapping.targetColumn,
              method: mapping.method,
              confidence: mapping.confidence,
              alternatives: mapping.alternativeMappings,
            },
          });
        }
      }
    }

    // Update ingestion with mapping result
    await db
      .update(ingestions)
      .set({
        mappingResult,
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    // Check if we need human review
    if (mappingResult.requiresReview) {
      log.info(
        {
          ingestionId,
          ambiguousMappings: mappingResult.ambiguousMappings.map((m) => m.sourceColumn),
        },
        "Mapping requires human review"
      );

      await db
        .update(ingestions)
        .set({ status: "awaiting_review", updatedAt: new Date() })
        .where(eq(ingestions.id, ingestionId));

      // Don't proceed - wait for human resolution via API
      return;
    }

    // Proceed to validation stage
    await db
      .update(ingestions)
      .set({ status: "validating", updatedAt: new Date() })
      .where(eq(ingestions.id, ingestionId));

    await validateQueue.add(
      `validate-${ingestionId}`,
      { ingestionId },
      { jobId: `validate-${ingestionId}` }
    );
  } catch (error) {
    log.error({ ingestionId, error }, "Map job failed");

    await db
      .update(ingestions)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown map error",
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    throw error;
  }
}

export const mapWorker = new Worker<MapJobData>(
  QUEUE_NAMES.MAP,
  processMapJob,
  {
    connection: redis,
    concurrency: 5,
  }
);

mapWorker.on("completed", (job) => {
  log.info(
    { jobId: job.id, ingestionId: job.data.ingestionId },
    "Map job completed"
  );
});

mapWorker.on("failed", (job, error) => {
  log.error({ jobId: job?.id, error }, "Map job failed");
});
