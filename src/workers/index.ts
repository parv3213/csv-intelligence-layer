import 'dotenv/config';
import { logger } from '../utils/logger.js';
import { waitForDeps } from "../utils/waitForDeps.js";
import { closeQueues } from './queues.js';

const log = logger.child({ module: 'worker-main' });

async function startWorkers() {
  try {
    log.info("Waiting for dependencies (DB, Redis)...");
    await waitForDeps();
    log.info("Dependencies ready");

    // Import workers after deps are ready so they don't initialize until Redis/DB are reachable
    await import("./parse.worker.js");
    await import("./infer.worker.js");
    await import("./map.worker.js");
    await import("./validate.worker.js");
    await import("./output.worker.js");

    log.info("All workers started (parse, infer, map, validate, output)");
  } catch (err) {
    log.error({ err }, "Worker startup failed");
    await closeQueues();
    process.exit(1);
  }
}

// Only run if this file is the main module
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startWorkers();

  // Graceful shutdown
  const shutdown = async () => {
    log.info('Shutting down workers...');
    await closeQueues();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export { startWorkers };
