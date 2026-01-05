// Column types supported by the system
export type ColumnType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'uuid'
  | 'url'
  | 'json';

// Validator types
export type Validator =
  | { type: 'regex'; pattern: string; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'enum'; values: string[]; message?: string }
  | { type: 'unique'; message?: string };

// Column definition in a canonical schema
export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  required?: boolean;
  nullable?: boolean;
  aliases?: string[];
  description?: string;
  default?: unknown;
  dateFormat?: string;
  coerceFormats?: string[];
  validators?: Validator[];
  strict?: boolean;
}

// Error policy options
export type ErrorPolicy = 'reject_row' | 'flag' | 'coerce_default' | 'abort';

// Canonical schema for CSV normalization
export interface CanonicalSchema {
  name: string;
  version?: string;
  description?: string;
  columns: ColumnDefinition[];
  errorPolicy?: ErrorPolicy;
  strict?: boolean;
}

// Schema response from API
export interface SchemaResponse {
  id: string;
  name: string;
  version: string;
  description: string | null;
  definition: CanonicalSchema;
  createdAt: string;
  updatedAt: string;
}

// Ingestion status enum
export type IngestionStatus =
  | 'pending'
  | 'parsing'
  | 'inferring'
  | 'mapping'
  | 'awaiting_review'
  | 'validating'
  | 'outputting'
  | 'complete'
  | 'failed';

// Inferred column from type inference
export interface InferredColumn {
  name: string;
  inferredType: ColumnType;
  confidence: number;
  nullable: boolean;
  uniqueRatio: number;
  sampleValues: unknown[];
  nullCount: number;
  totalCount: number;
}

// Inferred schema from parsing stage
export interface InferredSchema {
  columns: InferredColumn[];
  rowCount: number;
  parseErrors: number;
}

// Mapping method types
export type MappingMethod =
  | 'exact'
  | 'case_insensitive'
  | 'alias'
  | 'fuzzy'
  | 'ai'
  | 'manual'
  | 'unmapped';

// Column mapping result
export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string | null;
  method: MappingMethod;
  confidence: number;
  alternativeMappings?: { targetColumn: string; confidence: number }[];
}

// Mapping result from mapping stage
export interface MappingResult {
  mappings: ColumnMapping[];
  requiresReview: boolean;
  ambiguousMappings: ColumnMapping[];
}

// Cell error details
export interface CellError {
  row: number;
  column: string;
  value: unknown;
  expectedType: ColumnType;
  errorType: 'type_coercion' | 'validation_failed' | 'required_missing';
  message: string;
  validatorType?: string;
}

// Row error details
export interface RowError {
  row: number;
  errors: CellError[];
  action: 'rejected' | 'flagged' | 'coerced';
}

// Validation result from validation stage
export interface ValidationResult {
  validRowCount: number;
  invalidRowCount: number;
  errors: RowError[];
  errorsByColumn: Record<string, number>;
}

// Full ingestion response
export interface IngestionResponse {
  id: string;
  schemaId: string | null;
  status: IngestionStatus;
  rawFileKey: string;
  originalFilename: string | null;
  outputFileKey: string | null;
  rowCount: number | null;
  validRowCount: number | null;
  error: string | null;
  inferredSchema: InferredSchema | null;
  mappingResult: MappingResult | null;
  validationResult: ValidationResult | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// Pending review response
export interface PendingReviewResponse {
  ingestionId: string;
  status: 'awaiting_review';
  ambiguousMappings: ColumnMapping[];
}

// Human decision for resolving mappings
export interface MappingDecision {
  sourceColumn: string;
  targetColumn: string | null;
}

// Decision log entry
export interface DecisionLog {
  id: string;
  stage: 'parse' | 'infer' | 'map' | 'validate' | 'output';
  decisionType: string;
  details: Record<string, unknown>;
  createdAt: string;
}

// Create ingestion response
export interface CreateIngestionResponse {
  id: string;
  status: 'pending';
  message: string;
}

// Pipeline stage info for UI
export interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
  description: string;
}

// Local history entry for Zustand store
export interface HistoryEntry {
  id: string;
  filename: string;
  schemaName: string;
  schemaId: string | null;
  status: IngestionStatus;
  createdAt: string;
  completedAt: string | null;
  rowCount: number | null;
  validRowCount: number | null;
}
