import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { checkDbConnection } from "../db/index.js";
import { redis } from "../workers/queues.js";

const HealthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string(),
  services: z.object({
    database: z.boolean(),
    redis: z.boolean(),
  }),
});

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Health check",
        description:
          "Check the status of the API and its dependencies (Database, Redis)",
        tags: ["system"],
        response: {
          200: HealthResponseSchema,
          503: HealthResponseSchema,
        },
      },
    },
    async (_, reply) => {
      const dbHealthy = await checkDbConnection();

      let redisHealthy = false;
      try {
        await redis.ping();
        redisHealthy = true;
      } catch {
        redisHealthy = false;
      }

      const allHealthy = dbHealthy && redisHealthy;
      const anyHealthy = dbHealthy || redisHealthy;

      const status = allHealthy
        ? "healthy"
        : anyHealthy
        ? "degraded"
        : "unhealthy";
      const statusCode = allHealthy ? 200 : 503;

      return reply.code(statusCode).send({
        status,
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealthy,
          redis: redisHealthy,
        },
      });
    }
  );

  // Simple liveness probe
  fastify.get("/live", async () => {
    return { status: "ok" };
  });

  // Readiness probe
  fastify.get("/ready", async (_, reply) => {
    const dbHealthy = await checkDbConnection();

    if (dbHealthy) {
      return { status: "ready" };
    }

    return reply.code(503).send({ status: "not ready" });
  });
};
