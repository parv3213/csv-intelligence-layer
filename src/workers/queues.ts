import { Job, Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { config } from "../config.js";

// =============================================================================
// REDIS CONNECTION
// =============================================================================

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

export const redisSubscriber = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

// =============================================================================
// QUEUE NAMES
// =============================================================================

export const QUEUE_NAMES = {
  PARSE: "ingestion.parse",
  INFER: "ingestion.infer",
  MAP: "ingestion.map",
  VALIDATE: "ingestion.validate",
  OUTPUT: "ingestion.output",
} as const;

// =============================================================================
// JOB DATA TYPES
// =============================================================================

export interface ParseJobData {
  ingestionId: string;
  rawFileKey: string;
  schemaId: string | null;
}

export interface InferJobData {
  ingestionId: string;
}

export interface MapJobData {
  ingestionId: string;
  schemaId: string | null;
  resumeWithDecisions?: Array<{
    sourceColumn: string;
    targetColumn: string | null;
  }>;
}

export interface ValidateJobData {
  ingestionId: string;
}

export interface OutputJobData {
  ingestionId: string;
}

// =============================================================================
// QUEUE INSTANCES
// =============================================================================

const defaultQueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 500,
    },
  },
};

export const parseQueue = new Queue<ParseJobData>(
  QUEUE_NAMES.PARSE,
  defaultQueueOptions
);
export const inferQueue = new Queue<InferJobData>(
  QUEUE_NAMES.INFER,
  defaultQueueOptions
);
export const mapQueue = new Queue<MapJobData>(
  QUEUE_NAMES.MAP,
  defaultQueueOptions
);
export const validateQueue = new Queue<ValidateJobData>(
  QUEUE_NAMES.VALIDATE,
  defaultQueueOptions
);
export const outputQueue = new Queue<OutputJobData>(
  QUEUE_NAMES.OUTPUT,
  defaultQueueOptions
);

// =============================================================================
// QUEUE EVENTS (for monitoring)
// =============================================================================

export const parseQueueEvents = new QueueEvents(QUEUE_NAMES.PARSE, {
  connection: redisSubscriber,
});
export const inferQueueEvents = new QueueEvents(QUEUE_NAMES.INFER, {
  connection: redisSubscriber,
});
export const mapQueueEvents = new QueueEvents(QUEUE_NAMES.MAP, {
  connection: redisSubscriber,
});
export const validateQueueEvents = new QueueEvents(QUEUE_NAMES.VALIDATE, {
  connection: redisSubscriber,
});
export const outputQueueEvents = new QueueEvents(QUEUE_NAMES.OUTPUT, {
  connection: redisSubscriber,
});

// =============================================================================
// HELPER TO START A PIPELINE
// =============================================================================

export async function startIngestionPipeline(
  ingestionId: string,
  rawFileKey: string,
  schemaId: string | null
): Promise<Job<ParseJobData>> {
  // Start with parse job - each worker will trigger the next stage
  return parseQueue.add(
    `parse-${ingestionId}`,
    { ingestionId, rawFileKey, schemaId },
    {
      jobId: `parse-${ingestionId}`,
    }
  );
}

// =============================================================================
// CLEANUP
// =============================================================================

export async function closeQueues(): Promise<void> {
  await Promise.all([
    parseQueue.close(),
    inferQueue.close(),
    mapQueue.close(),
    validateQueue.close(),
    outputQueue.close(),
    parseQueueEvents.close(),
    inferQueueEvents.close(),
    mapQueueEvents.close(),
    validateQueueEvents.close(),
    outputQueueEvents.close(),
    redis.quit(),
    redisSubscriber.quit(),
  ]);
}
