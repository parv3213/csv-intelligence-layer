import { eq } from "drizzle-orm";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../db/index.js";
import { schemas } from "../db/schema.js";
import { CanonicalSchemaSchema } from "../types/index.js";

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

const SchemaResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  version: z.string(),
  description: z.string().nullable(),
  definition: CanonicalSchemaSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SchemaListResponseSchema = z.array(SchemaResponseSchema);

// =============================================================================
// ROUTES
// =============================================================================

export const schemaRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Create a new schema
  fastify.post(
    "/",
    {
      schema: {
        summary: "Create schema",
        description: "Define a new canonical schema for CSV normalization",
        tags: ["schemas"],
        body: CanonicalSchemaSchema,
        response: {
          201: SchemaResponseSchema,
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const definition = request.body;

      const [created] = await db
        .insert(schemas)
        .values({
          name: definition.name,
          version: definition.version,
          description: definition.description ?? null,
          definition,
        })
        .returning();

      if (!created) {
        return reply.code(500).send({ error: "Failed to create schema" });
      }

      return reply.code(201).send({
        id: created.id,
        name: created.name,
        version: created.version,
        description: created.description,
        definition: created.definition,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    }
  );

  // List all schemas
  fastify.get(
    "/",
    {
      schema: {
        summary: "List schemas",
        description: "Retrieve all defined canonical schemas",
        tags: ["schemas"],
        response: {
          200: SchemaListResponseSchema,
        },
      },
    },
    async () => {
      const allSchemas = await db
        .select()
        .from(schemas)
        .orderBy(schemas.createdAt);

      return allSchemas.map((s) => ({
        id: s.id,
        name: s.name,
        version: s.version,
        description: s.description,
        definition: s.definition,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));
    }
  );

  // Get schema by ID
  fastify.get(
    "/:id",
    {
      schema: {
        summary: "Get schema",
        description: "Retrieve a specific canonical schema by its ID",
        tags: ["schemas"],
        params: z.object({
          id: z.uuid(),
        }),
        response: {
          200: SchemaResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [schema] = await db
        .select()
        .from(schemas)
        .where(eq(schemas.id, id));

      if (!schema) {
        return reply.code(404).send({ error: "Schema not found" });
      }

      return {
        id: schema.id,
        name: schema.name,
        version: schema.version,
        description: schema.description,
        definition: schema.definition,
        createdAt: schema.createdAt.toISOString(),
        updatedAt: schema.updatedAt.toISOString(),
      };
    }
  );

  // Delete schema
  fastify.delete(
    "/:id",
    {
      schema: {
        summary: "Delete schema",
        description: "Remove a canonical schema definition",
        tags: ["schemas"],
        params: z.object({
          id: z.uuid(),
        }),
        response: {
          204: z.null(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const deleted = await db
        .delete(schemas)
        .where(eq(schemas.id, id))
        .returning();

      if (deleted.length === 0) {
        return reply.code(404).send({ error: "Schema not found" });
      }

      return reply.code(204).send();
    }
  );
};
