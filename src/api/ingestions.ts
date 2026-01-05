import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createReadStream } from "fs";
import { z } from "zod";
import { db } from "../db/index.js";
import { decisionLogs, ingestions, schemas } from "../db/schema.js";
import { applyHumanDecisions } from "../services/column-mapping.js";
import {
  generateRawFileKey,
  getFilePath,
  saveFile,
} from "../services/storage.js";
import {
  InferredSchemaSchema,
  IngestionStatusSchema,
  MappingResultSchema,
  ResolveAmbiguityRequestSchema,
  ValidationResultSchema,
} from "../types/index.js";
import { mapQueue, startIngestionPipeline } from "../workers/queues.js";

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

const IngestionResponseSchema = z.object({
  id: z.uuid(),
  schemaId: z.uuid().nullable(),
  status: IngestionStatusSchema,
  rawFileKey: z.string(),
  originalFilename: z.string().nullable(),
  outputFileKey: z.string().nullable(),
  rowCount: z.number().nullable(),
  validRowCount: z.number().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

const IngestionDetailResponseSchema = IngestionResponseSchema.extend({
  inferredSchema: InferredSchemaSchema.nullable(),
  mappingResult: MappingResultSchema.nullable(),
  validationResult: ValidationResultSchema.nullable(),
});

const PendingReviewResponseSchema = z.object({
  ingestionId: z.uuid(),
  status: z.literal("awaiting_review"),
  ambiguousMappings: z.array(
    z.object({
      sourceColumn: z.string(),
      targetColumn: z.string().nullable(),
      confidence: z.number(),
      alternativeMappings: z
        .array(
          z.object({
            targetColumn: z.string(),
            confidence: z.number(),
          })
        )
        .optional(),
    })
  ),
});

// =============================================================================
// ROUTES
// =============================================================================

export const ingestionRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Create new ingestion (upload CSV)
  fastify.post(
    "/",
    {
      schema: {
        summary: "Upload CSV",
        description: "Upload a CSV file to start the ingestion pipeline",
        tags: ["ingestions"],
        consumes: ["multipart/form-data"],
        querystring: z.object({
          schemaId: z.uuid(),
        }),
        body: z.object({
          // FIXME On swagger UI, this appears as type "string" - need to fix
          file: z.any().describe("CSV file to upload"),
        }),
        response: {
          202: z.object({
            id: z.uuid(),
            status: z.string(),
            message: z.string(),
          }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { schemaId } = request.query;
      const { file } = request.body;

      // Validate schema exists if provided
      if (schemaId) {
        const [schema] = await db
          .select()
          .from(schemas)
          .where(eq(schemas.id, schemaId));

        if (!schema) {
          return reply.code(400).send({ error: "Schema not found" });
        }
      }

      if (!file || !file.file) {
        return reply.code(400).send({ error: "No file uploaded" });
      }

      // Generate ingestion ID
      const ingestionId = randomUUID();
      const rawFileKey = generateRawFileKey(ingestionId, file.filename);

      // Save file to storage - convert multipart file to buffer
      const fileBuffer = await file.toBuffer();
      await saveFile(rawFileKey, fileBuffer);

      // Create ingestion record
      await db.insert(ingestions).values({
        id: ingestionId,
        schemaId: schemaId ?? null,
        status: "pending",
        rawFileKey,
        originalFilename: file.filename,
      });

      // Start pipeline
      await startIngestionPipeline(ingestionId, rawFileKey);

      return reply.code(202).send({
        id: ingestionId,
        status: "pending",
        message: "Ingestion started. Poll GET /ingestions/:id for status.",
      });
    }
  );

  // Get ingestion status
  fastify.get(
    "/:id",
    {
      schema: {
        summary: "Get ingestion status",
        description:
          "Retrieve the current status and results of an ingestion process",
        tags: ["ingestions"],
        params: z.object({
          id: z.uuid(),
        }),
        response: {
          200: IngestionDetailResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [ingestion] = await db
        .select()
        .from(ingestions)
        .where(eq(ingestions.id, id));

      if (!ingestion) {
        return reply.code(404).send({ error: "Ingestion not found" });
      }

      return {
        id: ingestion.id,
        schemaId: ingestion.schemaId,
        status: ingestion.status,
        rawFileKey: ingestion.rawFileKey,
        originalFilename: ingestion.originalFilename ?? null,
        outputFileKey: ingestion.outputFileKey,
        rowCount: ingestion.rowCount,
        validRowCount: ingestion.validRowCount,
        error: ingestion.error,
        inferredSchema: ingestion.inferredSchema,
        mappingResult: ingestion.mappingResult,
        validationResult: ingestion.validationResult,
        createdAt: ingestion.createdAt.toISOString(),
        updatedAt: ingestion.updatedAt.toISOString(),
        completedAt: ingestion.completedAt?.toISOString() ?? null,
      };
    }
  );

  // Get pending review details (when status = awaiting_review)
  fastify.get(
    "/:id/review",
    {
      schema: {
        summary: "Get pending review",
        description:
          "Retrieve details about ambiguous mappings that require human intervention",
        tags: ["ingestions"],
        params: z.object({
          id: z.uuid(),
        }),
        response: {
          200: PendingReviewResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [ingestion] = await db
        .select()
        .from(ingestions)
        .where(eq(ingestions.id, id));

      if (!ingestion) {
        return reply.code(404).send({ error: "Ingestion not found" });
      }

      if (ingestion.status !== "awaiting_review") {
        return reply.code(400).send({
          error: `Ingestion is not awaiting review. Current status: ${ingestion.status}`,
        });
      }

      const mappingResult = ingestion.mappingResult;

      return {
        ingestionId: ingestion.id,
        status: "awaiting_review" as const,
        ambiguousMappings: mappingResult?.ambiguousMappings ?? [],
      };
    }
  );

  // Resolve ambiguous mappings (human-in-the-loop)
  fastify.post(
    "/:id/resolve",
    {
      schema: {
        summary: "Resolve mappings",
        description:
          "Submit human decisions for ambiguous column mappings to resume the pipeline",
        tags: ["ingestions"],
        params: z.object({
          id: z.uuid(),
        }),
        body: ResolveAmbiguityRequestSchema,
        response: {
          200: z.object({
            status: z.string(),
            message: z.string(),
          }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { decisions } = request.body;

      const [ingestion] = await db
        .select()
        .from(ingestions)
        .where(eq(ingestions.id, id));

      if (!ingestion) {
        return reply.code(404).send({ error: "Ingestion not found" });
      }

      if (ingestion.status !== "awaiting_review") {
        return reply.code(400).send({
          error: `Ingestion is not awaiting review. Current status: ${ingestion.status}`,
        });
      }

      // Apply human decisions
      const updatedMappingResult = applyHumanDecisions(
        ingestion.mappingResult!,
        decisions
      );

      // Log the human decisions
      await db.insert(decisionLogs).values({
        ingestionId: id,
        stage: "map",
        decisionType: "human_resolved",
        details: { decisions },
      });

      // Update ingestion with resolved mappings
      await db
        .update(ingestions)
        .set({
          mappingResult: updatedMappingResult,
          updatedAt: new Date(),
        })
        .where(eq(ingestions.id, id));

      // Resume pipeline - trigger map job with decisions
      await mapQueue.add(
        `map-resume-${id}`,
        {
          ingestionId: id,
          schemaId: ingestion.schemaId,
          resumeWithDecisions: decisions,
        },
        { jobId: `map-resume-${id}` }
      );

      return {
        status: "resumed",
        message: "Mappings resolved. Pipeline will continue.",
      };
    }
  );

  // Get decision log for an ingestion
  fastify.get(
    "/:id/decisions",
    {
      schema: {
        summary: "Get decision log",
        description:
          "Retrieve the audit trail of all automated and human decisions made during ingestion",
        tags: ["ingestions"],
        params: z.object({
          id: z.uuid(),
        }),
        response: {
          200: z.array(
            z.object({
              id: z.uuid(),
              stage: z.string(),
              decisionType: z.string(),
              details: z.any(),
              createdAt: z.string(),
            })
          ),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const [ingestion] = await db
        .select()
        .from(ingestions)
        .where(eq(ingestions.id, id));

      if (!ingestion) {
        return reply.code(404).send({ error: "Ingestion not found" });
      }

      const logs = await db
        .select()
        .from(decisionLogs)
        .where(eq(decisionLogs.ingestionId, id))
        .orderBy(decisionLogs.createdAt);

      return logs.map((log) => ({
        id: log.id,
        stage: log.stage,
        decisionType: log.decisionType,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
      }));
    }
  );

  // Download output file
  fastify.get(
    "/:id/output",
    {
      schema: {
        summary: "Download output",
        description:
          "Download the processed and cleaned data in CSV or JSON format",
        tags: ["ingestions"],
        params: z.object({
          id: z.uuid(),
        }),
        querystring: z.object({
          format: z.enum(["csv", "json"]).default("csv"),
        }),
        produces: ["text/csv", "application/json"],
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { format } = request.query;

      const [ingestion] = await db
        .select()
        .from(ingestions)
        .where(eq(ingestions.id, id));

      if (!ingestion) {
        return reply.code(404).send({ error: "Ingestion not found" });
      }

      if (ingestion.status !== "complete") {
        return reply.code(400).send({
          error: `Ingestion not complete. Current status: ${ingestion.status}`,
        });
      }

      if (!ingestion.outputFileKey) {
        return reply.code(404).send({ error: "Output file not found" });
      }

      const filePath = await getFilePath(ingestion.outputFileKey);

      const contentType = format === "json" ? "application/json" : "text/csv";
      const filename = `${
        ingestion.originalFilename ?? "output"
      }.clean.${format}`;

      reply.header("Content-Type", contentType);
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);

      const stream = createReadStream(filePath);
      return reply.send(stream);
    }
  );
};
