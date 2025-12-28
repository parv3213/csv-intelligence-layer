import { stringSimilarity } from 'string-similarity-js';
import type {
  CanonicalSchema,
  ColumnDefinition,
  ColumnMapping,
  MappingMethod,
  MappingResult,
  InferredSchema,
} from '../types/index.js';
import { config } from '../config.js';

// =============================================================================
// STRING NORMALIZATION
// =============================================================================

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_\-\s]+/g, '') // Remove separators
    .replace(/[^a-z0-9]/g, ''); // Remove special chars
}

// =============================================================================
// MAPPING STRATEGIES
// =============================================================================

interface MappingCandidate {
  targetColumn: string;
  method: MappingMethod;
  confidence: number;
}

function findExactMatch(
  sourceColumn: string,
  targetColumns: ColumnDefinition[]
): MappingCandidate | null {
  const target = targetColumns.find((t) => t.name === sourceColumn);
  if (target) {
    return {
      targetColumn: target.name,
      method: 'exact',
      confidence: 1.0,
    };
  }
  return null;
}

function findCaseInsensitiveMatch(
  sourceColumn: string,
  targetColumns: ColumnDefinition[]
): MappingCandidate | null {
  const sourceLower = sourceColumn.toLowerCase();
  const target = targetColumns.find((t) => t.name.toLowerCase() === sourceLower);
  if (target) {
    return {
      targetColumn: target.name,
      method: 'case_insensitive',
      confidence: 0.95,
    };
  }
  return null;
}

function findAliasMatch(
  sourceColumn: string,
  targetColumns: ColumnDefinition[]
): MappingCandidate | null {
  const sourceLower = sourceColumn.toLowerCase();
  const sourceNormalized = normalize(sourceColumn);
  
  for (const target of targetColumns) {
    for (const alias of target.aliases) {
      if (alias.toLowerCase() === sourceLower || normalize(alias) === sourceNormalized) {
        return {
          targetColumn: target.name,
          method: 'alias',
          confidence: 0.9,
        };
      }
    }
  }
  return null;
}

function findFuzzyMatch(
  sourceColumn: string,
  targetColumns: ColumnDefinition[]
): MappingCandidate | null {
  const sourceNormalized = normalize(sourceColumn);
  
  let bestMatch: MappingCandidate | null = null;
  let bestScore = 0;
  
  for (const target of targetColumns) {
    const targetNormalized = normalize(target.name);
    const score = stringSimilarity(sourceNormalized, targetNormalized);
    
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = {
        targetColumn: target.name,
        method: 'fuzzy',
        confidence: score,
      };
    }
    
    // Also check aliases
    for (const alias of target.aliases) {
      const aliasNormalized = normalize(alias);
      const aliasScore = stringSimilarity(sourceNormalized, aliasNormalized);
      
      if (aliasScore > bestScore && aliasScore >= 0.5) {
        bestScore = aliasScore;
        bestMatch = {
          targetColumn: target.name,
          method: 'fuzzy',
          confidence: aliasScore,
        };
      }
    }
  }
  
  return bestMatch;
}

// =============================================================================
// MAIN MAPPING FUNCTION
// =============================================================================

export interface MapColumnsInput {
  inferredSchema: InferredSchema;
  canonicalSchema: CanonicalSchema;
  confidenceThreshold?: number;
}

export function mapColumns(input: MapColumnsInput): MappingResult {
  const {
    inferredSchema,
    canonicalSchema,
    confidenceThreshold = config.mappingConfidenceThreshold,
  } = input;
  
  const mappings: ColumnMapping[] = [];
  const usedTargets = new Set<string>();
  
  for (const sourceCol of inferredSchema.columns) {
    // Filter out already-mapped targets
    const availableTargets = canonicalSchema.columns.filter(
      (t) => !usedTargets.has(t.name)
    );
    
    // Try mapping strategies in order of confidence
    let candidate: MappingCandidate | null = null;
    
    candidate = findExactMatch(sourceCol.name, availableTargets);
    if (!candidate) candidate = findCaseInsensitiveMatch(sourceCol.name, availableTargets);
    if (!candidate) candidate = findAliasMatch(sourceCol.name, availableTargets);
    if (!candidate) candidate = findFuzzyMatch(sourceCol.name, availableTargets);
    
    // Collect alternative mappings for ambiguous cases
    const alternatives: Array<{ targetColumn: string; confidence: number }> = [];
    if (candidate && candidate.confidence < confidenceThreshold) {
      for (const target of availableTargets) {
        if (target.name !== candidate.targetColumn) {
          const score = stringSimilarity(normalize(sourceCol.name), normalize(target.name));
          if (score >= 0.4) {
            alternatives.push({ targetColumn: target.name, confidence: score });
          }
        }
      }
      alternatives.sort((a, b) => b.confidence - a.confidence);
    }
    
    if (candidate) {
      usedTargets.add(candidate.targetColumn);
      mappings.push({
        sourceColumn: sourceCol.name,
        targetColumn: candidate.targetColumn,
        method: candidate.method,
        confidence: candidate.confidence,
        alternativeMappings: alternatives.length > 0 ? alternatives.slice(0, 3) : undefined,
      });
    } else {
      mappings.push({
        sourceColumn: sourceCol.name,
        targetColumn: null,
        method: 'unmapped',
        confidence: 0,
      });
    }
  }
  
  // Identify ambiguous mappings that need review
  const ambiguousMappings = mappings.filter(
    (m) =>
      (m.confidence < confidenceThreshold && m.confidence > 0) ||
      (m.method === 'unmapped' && canonicalSchema.strict)
  );
  
  return {
    mappings,
    requiresReview: ambiguousMappings.length > 0,
    ambiguousMappings,
  };
}

// =============================================================================
// APPLY HUMAN DECISIONS
// =============================================================================

export interface HumanDecision {
  sourceColumn: string;
  targetColumn: string | null;
}

export function applyHumanDecisions(
  mappingResult: MappingResult,
  decisions: HumanDecision[]
): MappingResult {
  const decisionMap = new Map(decisions.map((d) => [d.sourceColumn, d.targetColumn]));
  
  const updatedMappings = mappingResult.mappings.map((mapping) => {
    if (decisionMap.has(mapping.sourceColumn)) {
      const targetColumn = decisionMap.get(mapping.sourceColumn)!;
      return {
        ...mapping,
        targetColumn,
        method: 'manual' as MappingMethod,
        confidence: 1.0,
        alternativeMappings: undefined,
      };
    }
    return mapping;
  });
  
  return {
    mappings: updatedMappings,
    requiresReview: false,
    ambiguousMappings: [],
  };
}
