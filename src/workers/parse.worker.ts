import { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { decisionLogs, ingestions } from "../db/schema.js";
import { parseCSV } from "../services/csv-parser.js";
import { getFilePath } from "../services/storage.js";
import { logger } from "../utils/logger.js";
import { QUEUE_NAMES, inferQueue, redis, type ParseJobData } from "./queues.js";

const log = logger.child({ worker: "parse" });

async function processParseJob(job: Job<ParseJobData>): Promise<void> {
  const { ingestionId, rawFileKey } = job.data;

  log.info({ ingestionId, rawFileKey }, "Starting parse job");

  // Update status to parsing
  await db
    .update(ingestions)
    .set({ status: "parsing", updatedAt: new Date() })
    .where(eq(ingestions.id, ingestionId));

  try {
    // Get file path from storage
    const filePath = await getFilePath(rawFileKey);

    // Parse CSV
    const parseResult = await parseCSV(filePath);

    log.info(
      {
        ingestionId,
        columns: parseResult.columns.length,
        rows: parseResult.totalRowCount,
        errors: parseResult.parseErrors.length,
      },
      "Parse complete"
    );

    // Log decision
    await db.insert(decisionLogs).values({
      ingestionId,
      stage: "parse",
      decisionType: "parse_complete",
      details: {
        columnCount: parseResult.columns.length,
        rowCount: parseResult.totalRowCount,
        parseErrors: parseResult.parseErrors.length,
        detectedDelimiter: parseResult.detectedDelimiter,
      },
    });

    // Update ingestion with row count
    await db
      .update(ingestions)
      .set({
        rowCount: parseResult.totalRowCount,
        status: "inferring",
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    // Trigger next stage
    await inferQueue.add(
      `infer-${ingestionId}`,
      { ingestionId },
      { jobId: `infer-${ingestionId}` }
    );
  } catch (error) {
    log.error({ ingestionId, error }, "Parse job failed");

    await db
      .update(ingestions)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown parse error",
        updatedAt: new Date(),
      })
      .where(eq(ingestions.id, ingestionId));

    throw error;
  }
}

export const parseWorker = new Worker<ParseJobData>(
  QUEUE_NAMES.PARSE,
  processParseJob,
  {
    connection: redis,
    concurrency: 5,
  }
);

parseWorker.on("completed", (job) => {
  log.info(
    { jobId: job.id, ingestionId: job.data.ingestionId },
    "Parse job completed"
  );
});

parseWorker.on("failed", (job, error) => {
  log.error({ jobId: job?.id, error }, "Parse job failed");
});
