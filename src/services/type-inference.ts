import type { ColumnType, InferredColumn, InferredSchema } from '../types/index.js';

// =============================================================================
// TYPE DETECTION UTILITIES
// =============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
const BOOLEAN_TRUE = new Set(['true', '1', 'yes', 'y', 'on']);
const BOOLEAN_FALSE = new Set(['false', '0', 'no', 'n', 'off']);

export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function isUrl(value: string): boolean {
  return URL_REGEX.test(value);
}

export function isISODate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isISODateTime(value: string): boolean {
  if (!ISO_DATETIME_REGEX.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isBoolean(value: string): boolean {
  const lower = value.toLowerCase();
  return BOOLEAN_TRUE.has(lower) || BOOLEAN_FALSE.has(lower);
}

export function isInteger(value: string): boolean {
  if (!/^-?\d+$/.test(value)) return false;
  const num = parseInt(value, 10);
  return !isNaN(num) && Number.isInteger(num);
}

export function isFloat(value: string): boolean {
  if (!/^-?\d*\.?\d+$/.test(value)) return false;
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

export function isJSON(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

// =============================================================================
// TYPE INFERENCE
// =============================================================================

function detectType(value: string): ColumnType {
  const trimmed = value.trim();
  
  // Order matters - more specific types first
  if (isUUID(trimmed)) return 'uuid';
  if (isEmail(trimmed)) return 'email';
  if (isUrl(trimmed)) return 'url';
  if (isISODateTime(trimmed)) return 'datetime';
  if (isISODate(trimmed)) return 'date';
  if (isBoolean(trimmed)) return 'boolean';
  if (isInteger(trimmed)) return 'integer';
  if (isFloat(trimmed)) return 'float';
  if (isJSON(trimmed)) return 'json';
  
  return 'string';
}

export function inferColumnType(samples: unknown[]): InferredColumn {
  const votes: Record<ColumnType, number> = {
    string: 0,
    integer: 0,
    float: 0,
    boolean: 0,
    date: 0,
    datetime: 0,
    email: 0,
    uuid: 0,
    url: 0,
    json: 0,
  };
  
  let nullCount = 0;
  const uniqueValues = new Set<string>();
  const sampleValues: unknown[] = [];
  
  for (const val of samples) {
    // Handle null/empty
    if (val === null || val === undefined || val === '') {
      nullCount++;
      continue;
    }
    
    const str = String(val).trim();
    uniqueValues.add(str);
    
    // Collect sample values (up to 5)
    if (sampleValues.length < 5 && !sampleValues.includes(str)) {
      sampleValues.push(str);
    }
    
    const type = detectType(str);
    votes[type]++;
  }
  
  const totalCount = samples.length;
  const nonNullCount = totalCount - nullCount;
  
  // Find dominant type
  let bestType: ColumnType = 'string';
  let bestCount = 0;
  
  for (const [type, count] of Object.entries(votes)) {
    if (count > bestCount) {
      bestType = type as ColumnType;
      bestCount = count;
    }
  }
  
  // Handle integer vs float ambiguity
  // If we have mostly integers but some floats, promote to float
  if (bestType === 'integer' && votes.float > 0) {
    bestType = 'float';
    bestCount = votes.integer + votes.float;
  }
  
  const confidence = nonNullCount > 0 ? bestCount / nonNullCount : 0;
  const uniqueRatio = nonNullCount > 0 ? uniqueValues.size / nonNullCount : 0;
  
  return {
    name: '', // Will be set by caller
    inferredType: bestType,
    confidence,
    nullable: nullCount > 0,
    uniqueRatio,
    sampleValues,
    nullCount,
    totalCount,
  };
}

// =============================================================================
// SCHEMA INFERENCE (from row samples)
// =============================================================================

export interface InferenceInput {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRowCount: number;
  parseErrors: number;
}

export function inferSchema(input: InferenceInput): InferredSchema {
  const { columns, rows, totalRowCount, parseErrors } = input;
  
  const inferredColumns: InferredColumn[] = columns.map((colName) => {
    const samples = rows.map((row) => row[colName]);
    const inferred = inferColumnType(samples);
    return {
      ...inferred,
      name: colName,
    };
  });
  
  return {
    columns: inferredColumns,
    rowCount: totalRowCount,
    parseErrors,
  };
}
