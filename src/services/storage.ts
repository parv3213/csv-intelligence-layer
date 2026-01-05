import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createWriteStream } from "fs";
import { access, mkdir, readFile, unlink, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

// =============================================================================
// STORAGE INTERFACE
// =============================================================================

export interface StorageProvider {
  save(key: string, data: Buffer | Readable): Promise<string>;
  load(key: string): Promise<Buffer>;
  getPath(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clearLocalCache(key: string): Promise<void>;
}

// =============================================================================
// LOCAL FILESYSTEM STORAGE
// =============================================================================

class LocalStorage implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getFullPath(key: string): string {
    return join(this.basePath, key);
  }

  async save(key: string, data: Buffer | Readable): Promise<string> {
    const fullPath = this.getFullPath(key);
    const dir = dirname(fullPath);

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    if (Buffer.isBuffer(data)) {
      await writeFile(fullPath, data);
    } else {
      const writeStream = createWriteStream(fullPath);
      await pipeline(data, writeStream);
    }

    return key;
  }

  async load(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    return readFile(fullPath);
  }

  async getPath(key: string): Promise<string> {
    return this.getFullPath(key);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    await unlink(fullPath);
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    try {
      await access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async clearLocalCache(_key: string): Promise<void> {
    // For local storage, the local file is the source of truth, so we don't clear it.
    return;
  }
}

// =============================================================================
// S3 STORAGE
// =============================================================================

class S3Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private cachePath: string;

  constructor() {
    const region = config.awsRegion;
    const accessKeyId = config.awsAccessKeyId;
    const secretAccessKey = config.awsSecretAccessKey;

    const clientConfig: any = { region };
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = { accessKeyId, secretAccessKey };
    }

    this.client = new S3Client(clientConfig);

    if (!config.s3Bucket) {
      throw new Error("S3_BUCKET is required for S3 storage");
    }
    this.bucket = config.s3Bucket;
    this.cachePath = config.storagePath;
  }

  private getCachePath(key: string): string {
    return join(this.cachePath, key);
  }

  async save(key: string, data: Buffer | Readable): Promise<string> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: data,
      },
    });

    await upload.done();

    // Invalidate cache if exists
    const cachePath = this.getCachePath(key);
    try {
      await unlink(cachePath);
      logger.debug({ key, cachePath }, "S3Storage: Invalidated local cache");
    } catch (error) {
      // ignore if not exists
    }

    return key;
  }

  async load(key: string): Promise<Buffer> {
    const path = await this.getPath(key);
    return readFile(path);
  }

  async getPath(key: string): Promise<string> {
    const cachePath = this.getCachePath(key);

    // Check if exists in cache
    try {
      await access(cachePath);
      return cachePath;
    } catch (error) {
      // Not in cache, download
    }

    // Ensure directory exists
    await mkdir(dirname(cachePath), { recursive: true });

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`File not found in S3: ${key}`);
    }

    // Stream to file
    const writeStream = createWriteStream(cachePath);
    await pipeline(response.Body as Readable, writeStream);

    return cachePath;
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);

    // Delete from cache
    const cachePath = this.getCachePath(key);
    try {
      await unlink(cachePath);
    } catch (error) {
      // ignore
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  async clearLocalCache(key: string): Promise<void> {
    const cachePath = this.getCachePath(key);
    try {
      await unlink(cachePath);
      logger.debug({ key, cachePath }, "S3Storage: Cleared local cache");
    } catch (error) {
      // ignore if not exists
    }
  }
}

// =============================================================================
// STORAGE SINGLETON
// =============================================================================

function createStorage(): StorageProvider {
  if (config.storageType === "s3") {
    return new S3Storage();
  }
  return new LocalStorage(config.storagePath);
}

export const storage = createStorage();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export async function saveFile(
  key: string,
  data: Buffer | Readable
): Promise<string> {
  return storage.save(key, data);
}

export async function loadFile(key: string): Promise<Buffer> {
  return storage.load(key);
}

export async function getFilePath(key: string): Promise<string> {
  return storage.getPath(key);
}

export async function clearLocalCache(key: string): Promise<void> {
  return storage.clearLocalCache(key);
}

export async function deleteFile(key: string): Promise<void> {
  return storage.delete(key);
}

export async function fileExists(key: string): Promise<boolean> {
  return storage.exists(key);
}

// =============================================================================
// KEY GENERATORS
// =============================================================================

export function generateRawFileKey(
  ingestionId: string,
  filename?: string
): string {
  const ext = filename?.split(".").pop() || "csv";
  return `raw/${ingestionId}.${ext}`;
}

export function generateOutputFileKey(
  ingestionId: string,
  format: "csv" | "json" = "csv"
): string {
  return `output/${ingestionId}.${format}`;
}
