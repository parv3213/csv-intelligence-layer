import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  CanonicalSchema,
  InferredSchema,
  IngestionStatus,
  MappingResult,
  ValidationResult,
} from "../types/index.js";

// =============================================================================
// SCHEMAS TABLE
// =============================================================================

export const schemas = pgTable(
  "schemas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    version: text("version").notNull().default("1.0.0"),
    description: text("description"),
    definition: jsonb("definition").notNull().$type<CanonicalSchema>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueNameVersion: unique().on(table.name, table.version),
  })
);

export type SchemaRow = typeof schemas.$inferSelect;
export type NewSchemaRow = typeof schemas.$inferInsert;

// =============================================================================
// INGESTIONS TABLE
// =============================================================================

export const ingestions = pgTable("ingestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  schemaId: uuid("schema_id").references(() => schemas.id),
  status: text("status").notNull().$type<IngestionStatus>().default("pending"),
  rawFileKey: text("raw_file_key").notNull(),
  originalFilename: text("original_filename"),
  outputFileKey: text("output_file_key"),

  // Pipeline outputs (stored as JSONB)
  inferredSchema: jsonb("inferred_schema").$type<InferredSchema>(),
  mappingResult: jsonb("mapping_result").$type<MappingResult>(),
  validationResult: jsonb("validation_result").$type<ValidationResult>(),

  // Stats
  rowCount: integer("row_count"),
  validRowCount: integer("valid_row_count"),

  // Error handling
  error: text("error"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type IngestionRow = typeof ingestions.$inferSelect;
export type NewIngestionRow = typeof ingestions.$inferInsert;

// =============================================================================
// MAPPING TEMPLATES TABLE
// =============================================================================

// Stores previously made mapping decisions for reuse
export const mappingTemplates = pgTable(
  "mapping_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schemaId: uuid("schema_id")
      .references(() => schemas.id)
      .notNull(),

    // Fingerprint of source columns (sorted, joined, hashed)
    sourceFingerprint: text("source_fingerprint").notNull(),

    // The mapping decisions
    mappings: jsonb("mappings").notNull().$type<
      Array<{
        sourceColumn: string;
        targetColumn: string | null;
      }>
    >(),

    // How many times this template has been used
    usageCount: integer("usage_count").default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueSchemaFingerprint: unique().on(
      table.schemaId,
      table.sourceFingerprint
    ),
  })
);

export type MappingTemplateRow = typeof mappingTemplates.$inferSelect;
export type NewMappingTemplateRow = typeof mappingTemplates.$inferInsert;

// =============================================================================
// DECISION LOG TABLE
// =============================================================================

// Audit trail for explainability
export const decisionLogs = pgTable("decision_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ingestionId: uuid("ingestion_id")
    .references(() => ingestions.id)
    .notNull(),
  stage: text("stage")
    .notNull()
    .$type<"parse" | "infer" | "map" | "validate" | "output">(),
  decisionType: text("decision_type").notNull(),
  details: jsonb("details").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type DecisionLogRow = typeof decisionLogs.$inferSelect;
export type NewDecisionLogRow = typeof decisionLogs.$inferInsert;
