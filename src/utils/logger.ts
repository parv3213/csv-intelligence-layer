import pino from "pino";
import { config } from "../config.js";

/**
 * Environment-specific logger configuration based on Fastify and Pino best practices.
 * @see https://fastify.dev/docs/latest/Reference/Logging/
 * @see https://github.com/pinojs/pino/blob/main/docs/web.md#fastify
 */
const envToLogger = {
  development: {
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "HH:MM:ss Z",
      },
    },
  },
  production: {
    level: "info",
  },
  test: false,
};

export const loggerConfig =
  envToLogger[config.nodeEnv as keyof typeof envToLogger] ?? true;

// Export a standalone logger instance for use outside of Fastify (e.g., workers, scripts)
export const logger =
  loggerConfig === true
    ? pino()
    : typeof loggerConfig === "object"
    ? pino(loggerConfig)
    : pino({ enabled: false });
