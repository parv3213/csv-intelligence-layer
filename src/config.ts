import { z } from "zod";

const ConfigSchema = z.object({
  // Server
  port: z.coerce.number().default(3000),
  host: z.string().default("0.0.0.0"),
  publicUrl: z.string().optional(),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  // Database
  databaseUrl: z.string().url(),

  // Redis
  redisUrl: z.string().url(),

  // Storage
  storageType: z.enum(["local", "s3"]).default("local"),
  storagePath: z.string().default("./temp/storage"),
  awsRegion: z.string().optional(),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  s3Bucket: z.string().optional(),

  // OpenAI
  openaiApiKey: z.string().optional(),

  // Pipeline settings
  inferenceSampleSize: z.coerce.number().default(1000),
  mappingConfidenceThreshold: z.coerce.number().default(0.8),
  maxFileSizeMb: z.coerce.number().default(100),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const result = ConfigSchema.safeParse({
    port: process.env.PORT,
    host: process.env.HOST,
    publicUrl: process.env.PUBLIC_URL,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    storageType: process.env.STORAGE_TYPE,
    storagePath: process.env.STORAGE_PATH,
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.S3_BUCKET,
    openaiApiKey: process.env.OPENAI_API_KEY,
    inferenceSampleSize: process.env.INFERENCE_SAMPLE_SIZE,
    mappingConfidenceThreshold: process.env.MAPPING_CONFIDENCE_THRESHOLD,
    maxFileSizeMb: process.env.MAX_FILE_SIZE_MB,
  });

  if (!result.success) {
    console.error("Configuration validation failed:");
    console.error(result.error.format());

    console.log("process.env", process.env);
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
