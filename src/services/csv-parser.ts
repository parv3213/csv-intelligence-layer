import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import type { InferenceInput } from './type-inference.js';
import { config } from '../config.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ParseOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  encoding?: BufferEncoding;
  sampleSize?: number;
  skipEmptyLines?: boolean;
  relaxColumnCount?: boolean;
}

export interface ParseResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRowCount: number;
  parseErrors: ParseError[];
  detectedDelimiter: string;
}

export interface ParseError {
  row: number;
  message: string;
  rawLine?: string;
}

// =============================================================================
// DELIMITER DETECTION
// =============================================================================

const COMMON_DELIMITERS = [',', ';', '\t', '|'];

async function detectDelimiter(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { end: 4096 }); // Read first 4KB
    let data = '';
    
    stream.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    stream.on('end', () => {
      const firstLine = data.split('\n')[0] || '';
      
      // Count occurrences of each delimiter in first line
      const counts = COMMON_DELIMITERS.map((delim) => ({
        delim,
        count: (firstLine.match(new RegExp(`\\${delim}`, 'g')) || []).length,
      }));
      
      // Pick the one with highest count (and at least 1)
      counts.sort((a, b) => b.count - a.count);
      resolve(counts[0]?.count > 0 ? counts[0].delim : ',');
    });
    
    stream.on('error', reject);
  });
}

// =============================================================================
// STREAMING PARSER
// =============================================================================

export async function parseCSV(
  filePath: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const {
    sampleSize = config.inferenceSampleSize,
    skipEmptyLines = true,
    relaxColumnCount = true,
  } = options;
  
  // Auto-detect delimiter if not provided
  const delimiter = options.delimiter ?? (await detectDelimiter(filePath));
  
  const parseErrors: ParseError[] = [];
  const rows: Record<string, unknown>[] = [];
  let columns: string[] = [];
  let totalRowCount = 0;
  
  return new Promise((resolve, reject) => {
    const parser = parse({
      delimiter,
      quote: options.quote ?? '"',
      escape: options.escape ?? '"',
      columns: true, // Use first row as headers
      skip_empty_lines: skipEmptyLines,
      relax_column_count: relaxColumnCount,
      on_record: (record, context) => {
        totalRowCount++;
        
        // Capture column names from first record
        if (columns.length === 0) {
          columns = Object.keys(record);
        }
        
        // Only keep samples up to sampleSize
        if (rows.length < sampleSize) {
          rows.push(record);
        }
        
        return record;
      },
    });
    
    parser.on('error', (err) => {
      parseErrors.push({
        row: totalRowCount,
        message: err.message,
      });
    });
    
    const stream = createReadStream(filePath);
    
    stream
      .pipe(parser)
      .on('end', () => {
        resolve({
          columns,
          rows,
          totalRowCount,
          parseErrors,
          detectedDelimiter: delimiter,
        });
      })
      .on('error', reject);
  });
}

// =============================================================================
// PARSE FROM BUFFER (for API uploads)
// =============================================================================

export async function parseCSVBuffer(
  buffer: Buffer,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const {
    delimiter = ',',
    sampleSize = config.inferenceSampleSize,
    skipEmptyLines = true,
    relaxColumnCount = true,
  } = options;
  
  const parseErrors: ParseError[] = [];
  const rows: Record<string, unknown>[] = [];
  let columns: string[] = [];
  let totalRowCount = 0;
  
  return new Promise((resolve, reject) => {
    const parser = parse({
      delimiter,
      quote: options.quote ?? '"',
      escape: options.escape ?? '"',
      columns: true,
      skip_empty_lines: skipEmptyLines,
      relax_column_count: relaxColumnCount,
      on_record: (record) => {
        totalRowCount++;
        
        if (columns.length === 0) {
          columns = Object.keys(record);
        }
        
        if (rows.length < sampleSize) {
          rows.push(record);
        }
        
        return record;
      },
    });
    
    parser.on('error', (err) => {
      parseErrors.push({
        row: totalRowCount,
        message: err.message,
      });
    });
    
    const readable = Readable.from(buffer);
    
    readable
      .pipe(parser)
      .on('end', () => {
        resolve({
          columns,
          rows,
          totalRowCount,
          parseErrors,
          detectedDelimiter: delimiter,
        });
      })
      .on('error', reject);
  });
}

// =============================================================================
// CONVERT TO INFERENCE INPUT
// =============================================================================

export function toInferenceInput(parseResult: ParseResult): InferenceInput {
  return {
    columns: parseResult.columns,
    rows: parseResult.rows,
    totalRowCount: parseResult.totalRowCount,
    parseErrors: parseResult.parseErrors.length,
  };
}
