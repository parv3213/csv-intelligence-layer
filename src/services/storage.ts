import { createWriteStream } from "fs";
import { access, mkdir, readFile, unlink, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { config } from "../config.js";

// =============================================================================
// STORAGE INTERFACE
// =============================================================================

export interface StorageProvider {
  save(key: string, data: Buffer | Readable): Promise<string>;
  load(key: string): Promise<Buffer>;
  getPath(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
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
}

// =============================================================================
// S3 STORAGE (placeholder - implement when needed)
// =============================================================================

class S3Storage implements StorageProvider {
  constructor() {
    // TODO: Initialize S3 client
  }

  async save(key: string, data: Buffer | Readable): Promise<string> {
    throw new Error("S3 storage not implemented yet");
  }

  async load(key: string): Promise<Buffer> {
    throw new Error("S3 storage not implemented yet");
  }

  async getPath(key: string): Promise<string> {
    throw new Error("S3 storage does not support direct paths");
  }

  async delete(key: string): Promise<void> {
    throw new Error("S3 storage not implemented yet");
  }

  async exists(key: string): Promise<boolean> {
    throw new Error("S3 storage not implemented yet");
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
