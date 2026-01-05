import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { config } from "./config.js";
import { loggerConfig } from "./utils/logger.js";
import { waitForDeps } from "./utils/waitForDeps.js";
import { redis } from "./workers/queues.js";

// Import routes
import { healthRoutes } from "./api/health.js";
import { ingestionRoutes } from "./api/ingestions.js";
import { schemaRoutes } from "./api/schemas.js";

export async function buildServer() {
  const fastify = Fastify({
    logger: loggerConfig,
  }).withTypeProvider<ZodTypeProvider>();

  // Set up Zod validation
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register plugins
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(multipart, {
    attachFieldsToBody: true,
    limits: {
      fileSize: config.maxFileSizeMb * 1024 * 1024,
    },
  });

  const serverUrl = config.publicUrl || `http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`;

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "CSV Intelligence Layer API",
        description: "Production-grade CSV ingestion and normalization service",
        version: "0.1.0",
      },
      servers: [
        {
          url: serverUrl,
          description: "API Server",
        },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
  });

  // Register routes
  await fastify.register(healthRoutes, { prefix: "/health" });
  await fastify.register(schemaRoutes, { prefix: "/schemas" });
  await fastify.register(ingestionRoutes, { prefix: "/ingestions" });

  return fastify;
}

export async function startServer(handleSignals = true) {
  const server = await buildServer();

  // Graceful shutdown
  const shutdown = async () => {
    server.log.info("Shutting down server...");
    await server.close();
    await redis.quit();
    if (handleSignals) {
      process.exit(0);
    }
  };

  if (handleSignals) {
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  try {
    server.log.info("Waiting for dependencies (DB, Redis)...");
    await waitForDeps();
    server.log.info("Dependencies ready");

    await server.listen({ port: config.port, host: config.host });
    const serverUrl = config.publicUrl || `http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`;
    server.log.info(`Server running at ${serverUrl}`);
    server.log.info(`API docs at ${serverUrl}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
