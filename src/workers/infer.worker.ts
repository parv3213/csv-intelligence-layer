import { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { decisionLogs, ingestions } from "../db/schema.js";
import { parseCSV, toInferenceInput } from "../services/csv-parser.js";
import { getFilePath } from "../services/storage.js";
import { inferSchema } from "../services/type-inference.js";
import { logger } from "../utils/logger.js";
import { QUEUE_NAMES, mapQueue, redis, type InferJobData } from "./queues.js";

const log = logger.child({ worker: "infer" });

async function processInferJob(job: Job<InferJobData>): Promise<void> {
  const { ingestionId } = job.data;

  log.info({ ingestionId }, "Starting infer job");

  // Update status to inferring
  await db
    .update(ingestions)
    .set({ status: "inferring", updatedAt: new Date() })
    .where(eq(ingestions.id, ingestionId));

  try {
    // Get ingestion record to retrieve rawFileKey and schemaId
    const [ingestion] = await db
      .select()
      .from(ingestions)
      .where(eq(ingestions.id, ingestionId))
      .limit(1);

    if (!ingestion) {
      throw new Error(`Ingestion not found: ${ingestionId}`);
    }

    // Get file path from storage
    const filePath = await getFilePath(ingestion.rawFileKey);

    // Re-parse CSV to get samples for type inference
    const parseResult = await parseCSV(filePath);
    const inferenceInput = toInferenceInput(parseResult);

    // Infer schema from samples
    const inferredSchema = inferSchema(inferenceInput);

    log.info(
      {
        ingestionId,
        columnCount: inferredSchema.columns.length,
        columns: inferredSchema.columns.map((c) => ({
          name: c.name,
          type: c.inferredType,
          confidence: c.confidence,
        })),
      },
      "Inference complete"
    );

    // Log decision
    await db.insert(decisionLogs).values({
      ingestionId,
      stage: "infer",
      decisionType: "type_inference",
      details: {
        columns: inferredSchema.columns.map((col) => ({
          name: col.name,
          inferredType: col.inferredType,
          confidence: col.confidence,
          nullable: col.nullable,
          uniqueRatio: col.uniqueRatio,
          sampleCount: col.totalCount,
          nullCount: col.nullCount,
          sampleValues: col.sampleValues,
        })),
        rowCount: inferredSchema.rowCount,
        parseErrors: inferredSchema.parseErrors,
      },
    });

    // Update ingestion with inferred schema
    await db
      .update(ingestions)
      .set({
        inferredSchema,
        status: "mapping",
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    // Trigger next stage (map)
    await mapQueue.add(
      `map-${ingestionId}`,
      {
        ingestionId,
        schemaId: ingestion.schemaId,
      },
      { jobId: `map-${ingestionId}` }
    );
  } catch (error) {
    log.error({ ingestionId, error }, "Infer job failed");

    await db
      .update(ingestions)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown infer error",
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    throw error;
  }
}

export const inferWorker = new Worker<InferJobData>(
  QUEUE_NAMES.INFER,
  processInferJob,
  {
    connection: redis,
    concurrency: 5,
  }
);

inferWorker.on("completed", (job) => {
  log.info(
    { jobId: job.id, ingestionId: job.data.ingestionId },
    "Infer job completed"
  );
});

inferWorker.on("failed", (job, error) => {
  log.error({ jobId: job?.id, error }, "Infer job failed");
});
