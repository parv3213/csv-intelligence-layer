import { z } from "zod";

// =============================================================================
// COLUMN TYPES
// =============================================================================

export const ColumnTypeSchema = z.enum([
  "string",
  "integer",
  "float",
  "boolean",
  "date",
  "datetime",
  "email",
  "uuid",
  "url",
  "json",
]);

export type ColumnType = z.infer<typeof ColumnTypeSchema>;

// =============================================================================
// VALIDATORS
// =============================================================================

export const ValidatorSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("regex"),
    pattern: z.string(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("min"),
    value: z.number(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("max"),
    value: z.number(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("minLength"),
    value: z.number(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("maxLength"),
    value: z.number(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("enum"),
    values: z.array(z.string()),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("unique"),
    message: z.string().optional(),
  }),
]);

export type Validator = z.infer<typeof ValidatorSchema>;

// =============================================================================
// CANONICAL SCHEMA DEFINITION
// =============================================================================

export const ColumnDefinitionSchema = z.object({
  name: z.string().min(1),
  type: ColumnTypeSchema,
  required: z.boolean().default(false),
  nullable: z.boolean().default(true),
  aliases: z.array(z.string()).default([]),
  description: z.string().optional(),
  default: z.any().optional(),
  dateFormat: z.string().optional(), // For date/datetime columns
  coerceFormats: z.array(z.string()).optional(), // Alternative formats to try
  validators: z.array(ValidatorSchema).default([]),
});

export type ColumnDefinition = z.infer<typeof ColumnDefinitionSchema>;

export const ErrorPolicySchema = z.enum([
  "reject_row", // Exclude row from output, log error
  "flag", // Include row, add _errors column
  "coerce_default", // Replace with default value
  "abort", // Stop entire pipeline
]);

export type ErrorPolicy = z.infer<typeof ErrorPolicySchema>;

export const CanonicalSchemaSchema = z.object({
  name: z.string().min(1),
  version: z.string().default("1.0.0"),
  description: z.string().optional(),
  columns: z.array(ColumnDefinitionSchema).min(1),
  errorPolicy: ErrorPolicySchema.default("flag"),
  strict: z.boolean().default(false), // If true, reject unmapped columns
});

export type CanonicalSchema = z.infer<typeof CanonicalSchemaSchema>;

// =============================================================================
// INGESTION STATUS
// =============================================================================

export const IngestionStatusSchema = z.enum([
  "pending",
  "parsing",
  "inferring",
  "mapping",
  "awaiting_review",
  "validating",
  "outputting",
  "complete",
  "failed",
]);

export type IngestionStatus = z.infer<typeof IngestionStatusSchema>;

// =============================================================================
// INFERRED SCHEMA (output of inference stage)
// =============================================================================

export const InferredColumnSchema = z.object({
  name: z.string(),
  inferredType: ColumnTypeSchema,
  confidence: z.number(),
  nullable: z.boolean(),
  uniqueRatio: z.number(), // 0-1, how unique values are
  sampleValues: z.array(z.any()),
  nullCount: z.number(),
  totalCount: z.number(),
});

export type InferredColumn = z.infer<typeof InferredColumnSchema>;

export const InferredSchemaSchema = z.object({
  columns: z.array(InferredColumnSchema),
  rowCount: z.number(),
  parseErrors: z.number(),
});

export type InferredSchema = z.infer<typeof InferredSchemaSchema>;

// =============================================================================
// COLUMN MAPPING
// =============================================================================

export const MappingMethodSchema = z.enum([
  "exact", // Exact name match
  "case_insensitive", // Same after lowercasing
  "alias", // Matched via alias list
  "fuzzy", // Fuzzy string matching
  "ai", // AI-suggested mapping
  "manual", // Human-in-the-loop decision
  "unmapped", // No match found
]);

export type MappingMethod = z.infer<typeof MappingMethodSchema>;

export const ColumnMappingSchema = z.object({
  sourceColumn: z.string(),
  targetColumn: z.string().nullable(), // null if unmapped
  method: MappingMethodSchema,
  confidence: z.number(),
  alternativeMappings: z
    .array(
      z.object({
        targetColumn: z.string(),
        confidence: z.number(),
      })
    )
    .optional(),
});

export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

export const MappingResultSchema = z.object({
  mappings: z.array(ColumnMappingSchema),
  requiresReview: z.boolean(),
  ambiguousMappings: z.array(ColumnMappingSchema),
});

export type MappingResult = z.infer<typeof MappingResultSchema>;

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

export const CellErrorSchema = z.object({
  row: z.number(),
  column: z.string(),
  value: z.any(),
  expectedType: ColumnTypeSchema,
  errorType: z.enum(["type_coercion", "validation_failed", "required_missing"]),
  message: z.string(),
  validatorType: z.string().optional(),
});

export type CellError = z.infer<typeof CellErrorSchema>;

export const RowErrorSchema = z.object({
  row: z.number(),
  errors: z.array(CellErrorSchema),
  action: z.enum(["rejected", "flagged", "coerced"]),
});

export type RowError = z.infer<typeof RowErrorSchema>;

export const ValidationResultSchema = z.object({
  validRowCount: z.number(),
  invalidRowCount: z.number(),
  errors: z.array(RowErrorSchema),
  errorsByColumn: z.record(z.string(), z.number()),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// =============================================================================
// DECISION LOG (for explainability)
// =============================================================================

export type DecisionType =
  | "column_mapped"
  | "column_unmapped"
  | "type_inferred"
  | "type_coerced"
  | "validation_passed"
  | "validation_failed"
  | "row_rejected"
  | "row_flagged"
  | "default_applied"
  | "human_resolved";

export const DecisionSchema = z.object({
  stage: z.enum(["parse", "infer", "map", "validate", "output"]),
  type: z.string(), // Using string for DecisionType to simplify
  timestamp: z.date(),
  details: z.record(z.string(), z.any()),
});

export type Decision = z.infer<typeof DecisionSchema>;

// =============================================================================
// INGESTION JOB
// =============================================================================

export const IngestionSchema = z.object({
  id: z.uuid(),
  schemaId: z.uuid().nullable(),
  status: IngestionStatusSchema,
  rawFileKey: z.string(),
  outputFileKey: z.string().nullable(),
  inferredSchema: InferredSchemaSchema.nullable(),
  mappingResult: MappingResultSchema.nullable(),
  validationResult: ValidationResultSchema.nullable(),
  decisions: z.array(DecisionSchema),
  error: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Ingestion = z.infer<typeof IngestionSchema>;

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export const CreateIngestionRequestSchema = z.object({
  schemaId: z.uuid().optional(),
  filename: z.string().optional(),
});

export type CreateIngestionRequest = z.infer<
  typeof CreateIngestionRequestSchema
>;

export const ResolveAmbiguityRequestSchema = z.object({
  decisions: z.array(
    z.object({
      sourceColumn: z.string(),
      targetColumn: z.string().nullable(),
    })
  ),
});

export type ResolveAmbiguityRequest = z.infer<
  typeof ResolveAmbiguityRequestSchema
>;

export const CreateSchemaRequestSchema = CanonicalSchemaSchema;

export type CreateSchemaRequest = z.infer<typeof CreateSchemaRequestSchema>;
