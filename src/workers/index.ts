import 'dotenv/config';
import { logger } from '../utils/logger.js';
import { closeQueues } from './queues.js';

// Import all workers to start them
import './parse.worker.js';
// TODO: Add other workers as they're implemented
// import './infer.worker.js';
// import './map.worker.js';
// import './validate.worker.js';
// import './output.worker.js';

const log = logger.child({ module: 'worker-main' });

log.info('Workers started');

// Graceful shutdown
const shutdown = async () => {
  log.info('Shutting down workers...');
  await closeQueues();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
