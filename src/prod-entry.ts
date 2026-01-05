import "dotenv/config";
import { runMigrations } from "./db/index.js";
import { startServer } from "./server.js";
import { logger } from "./utils/logger.js";
import { startWorkers } from "./workers/index.js";
import { closeQueues } from "./workers/queues.js";

const log = logger.child({ module: "prod-entry" });

async function start() {
  try {
    log.info("Starting production server and workers...");

    // Run migrations
    log.info("Running database migrations...");
    await runMigrations();
    log.info("Migrations complete");

    // Start Server (without internal signal handling)
    await startServer(false);

    // Start Workers
    await startWorkers();

    log.info("System ready");

    // Unified Shutdown
    const shutdown = async () => {
      log.info("Shutting down system...");

      // Close queues (workers)
      await closeQueues();

      log.info("Shutdown complete");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    log.error({ err }, "Startup failed");
    process.exit(1);
  }
}

start();
