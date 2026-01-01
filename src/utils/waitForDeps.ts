import { checkDbConnection } from "../db/index.js";
import { redis } from "../workers/queues.js";

type WaitOpts = {
  retries?: number;
  initialDelayMs?: number;
};

export async function waitForDeps(opts: WaitOpts = {}): Promise<void> {
  const { retries = 6, initialDelayMs = 200 } = opts;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Redis
      const pong = await redis.ping();
      if (pong !== "PONG") throw new Error("Redis ping failed");

      // Database
      const dbOk = await checkDbConnection();
      if (!dbOk) throw new Error("DB connection check failed");

      return;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const delay = initialDelayMs * Math.pow(2, attempt);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}
