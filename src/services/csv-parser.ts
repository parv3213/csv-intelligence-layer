import { parse } from 'csv-parse';
import { createReadStream } from "fs";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import type { InferenceInput } from "./type-inference.js";

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

const COMMON_DELIMITERS = [",", ";", "\t", "|"];

// Escape a string for use in a RegExp
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function detectDelimiter(
  filePath: string,
  encoding?: BufferEncoding
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { end: 4096 }); // Read first 4KB
    let data = "";

    if (encoding) {
      stream.setEncoding(encoding);
    }

    stream.on("data", (chunk) => {
      data += typeof chunk === "string" ? chunk : chunk.toString();
    });

    stream.on("end", () => {
      if (!data) return resolve(",");
      const firstLine = data.split("\n")[0] || "";
      if (!firstLine) return resolve(",");

      // Count occurrences of each delimiter in first line using escaped regex
      const counts = COMMON_DELIMITERS.map((delim) => {
        const pattern = new RegExp(escapeRegExp(delim), "g");
        const count = (firstLine.match(pattern) || []).length;
        return { delim, count };
      });

      // Pick the one with highest count (and at least 1)
      counts.sort((a, b) => b.count - a.count);
      const best = counts[0];
      resolve(best && best.count > 0 ? best.delim : ",");
    });

    stream.on("error", reject);
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

  // Auto-detect delimiter if not provided (best-effort)
  let delimiter = options.delimiter;
  if (!delimiter) {
    try {
      delimiter = await detectDelimiter(filePath, options.encoding);
    } catch (err) {
      // fallback to comma on detection failure
      logger.warn(
        { filePath, err },
        "parseCSV: delimiter detection failed, falling back to comma"
      );
      delimiter = ",";
    }
  }

  const parseErrors: ParseError[] = [];
  const rows: Record<string, unknown>[] = [];
  let columns: string[] = [];
  let totalRowCount = 0;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finishOnce = (fn: () => void) => {
      return () => {
        if (settled) return;
        logger.info(
          {
            filePath,
            columns: columns.length,
            totalRowCount,
            parseErrors: parseErrors.length,
            detectedDelimiter: delimiter,
          },
          "parseCSV: complete"
        );
        settled = true;
        fn();
      };
    };

    const parser = parse({
      delimiter,
      quote: options.quote ?? '"',
      escape: options.escape ?? '"',
      columns: true, // Use first row as headers
      skip_empty_lines: skipEmptyLines,
      relax_column_count: relaxColumnCount,
      on_record: (record) => {
        totalRowCount++;

        // Capture column names from first record
        if (columns.length === 0) {
          columns = Object.keys(record as Record<string, unknown>);
        }

        // Only keep samples up to sampleSize
        if (rows.length < sampleSize) {
          rows.push(record as Record<string, unknown>);
        }

        return record;
      },
    });

    parser.on("error", (err) => {
      parseErrors.push({
        row: totalRowCount,
        message: err.message,
      });
      logger.error({ filePath, row: totalRowCount, err }, "csv-parse error");

      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    const stream = createReadStream(filePath);

    stream.on("error", (err) => {
      logger.error({ filePath, err }, "read stream error");
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    parser.on(
      "end",
      finishOnce(() => {
        resolve({
          columns,
          rows,
          totalRowCount,
          parseErrors,
          detectedDelimiter: delimiter,
        });
      })
    );

    parser.on(
      "finish",
      finishOnce(() => {
        resolve({
          columns,
          rows,
          totalRowCount,
          parseErrors,
          detectedDelimiter: delimiter,
        });
      })
    );

    parser.on(
      "close",
      finishOnce(() => {
        resolve({
          columns,
          rows,
          totalRowCount,
          parseErrors,
          detectedDelimiter: delimiter,
        });
      })
    );

    // Pipe after listeners attached
    stream.pipe(parser);
    // Consume the output to prevent backpressure since we're using on_record
    parser.resume();
  });
}

// // =============================================================================
// // PARSE FROM BUFFER (for API uploads)
// // =============================================================================

// export async function parseCSVBuffer(
//   buffer: Buffer,
//   options: ParseOptions = {}
// ): Promise<ParseResult> {
//   const {
//     delimiter = ",",
//     sampleSize = config.inferenceSampleSize,
//     skipEmptyLines = true,
//     relaxColumnCount = true,
//   } = options;

//   const parseErrors: ParseError[] = [];
//   const rows: Record<string, unknown>[] = [];
//   let columns: string[] = [];
//   let totalRowCount = 0;

//   return new Promise((resolve, reject) => {
//     const parser = parse({
//       delimiter,
//       quote: options.quote ?? '"',
//       escape: options.escape ?? '"',
//       columns: true,
//       skip_empty_lines: skipEmptyLines,
//       relax_column_count: relaxColumnCount,
//       on_record: (record) => {
//         totalRowCount++;

//         if (columns.length === 0) {
//           columns = Object.keys(record as Record<string, unknown>);
//         }

//         if (rows.length < sampleSize) {
//           rows.push(record as Record<string, unknown>);
//         }

//         return record;
//       },
//     });

//     parser.on("error", (err) => {
//       parseErrors.push({
//         row: totalRowCount,
//         message: err.message,
//       });
//       logger.error({ err, filePath: "buffer" }, "csv-parse buffer error");
//     });

//     const readable = Readable.from([buffer]);

//     readable
//       .pipe(parser)
//       .on("end", () => {
//         resolve({
//           columns,
//           rows,
//           totalRowCount,
//           parseErrors,
//           detectedDelimiter: delimiter,
//         });
//       })
//       .on("error", (err) => {
//         logger.error({ err }, "parseCSVBuffer: parser stream error");
//         reject(err);
//       });
//   });
// }

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
