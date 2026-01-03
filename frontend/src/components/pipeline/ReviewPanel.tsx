import { useState, useMemo } from 'react';
import { AlertTriangle, Check, X, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIngestionReview, useResolveIngestion } from '@/hooks/useIngestion';
import type { ColumnMapping, MappingDecision, SchemaResponse } from '@/types';

interface ReviewPanelProps {
  ingestionId: string;
  schema: SchemaResponse;
  onResolved: () => void;
}

export function ReviewPanel({ ingestionId, schema, onResolved }: ReviewPanelProps) {
  const { data: review, isLoading, error } = useIngestionReview(ingestionId);
  const resolveMutation = useResolveIngestion();
  const [decisions, setDecisions] = useState<Record<string, string | null>>({});

  const targetColumns = useMemo(() => {
    return schema.definition.columns.map((col) => col.name);
  }, [schema]);

  const handleDecisionChange = (sourceColumn: string, targetColumn: string | null) => {
    setDecisions((prev) => ({
      ...prev,
      [sourceColumn]: targetColumn,
    }));
  };

  const handleSubmit = async () => {
    if (!review) return;

    const mappingDecisions: MappingDecision[] = review.ambiguousMappings.map((mapping) => ({
      sourceColumn: mapping.sourceColumn,
      targetColumn: decisions[mapping.sourceColumn] ?? mapping.targetColumn,
    }));

    try {
      await resolveMutation.mutateAsync({ id: ingestionId, decisions: mappingDecisions });
      onResolved();
    } catch (err) {
      console.error('Failed to resolve mappings:', err);
    }
  };

  const allDecisionsMade = useMemo(() => {
    if (!review) return false;
    return review.ambiguousMappings.every(
      (mapping) => decisions[mapping.sourceColumn] !== undefined
    );
  }, [review, decisions]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading review data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !review) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>Failed to load review data</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Human Review Required
        </CardTitle>
        <CardDescription>
          {review.ambiguousMappings.length} column mapping(s) need your decision
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {review.ambiguousMappings.map((mapping) => (
            <MappingRow
              key={mapping.sourceColumn}
              mapping={mapping}
              targetColumns={targetColumns}
              currentDecision={decisions[mapping.sourceColumn]}
              onDecisionChange={(target) =>
                handleDecisionChange(mapping.sourceColumn, target)
              }
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {allDecisionsMade
              ? 'All mappings reviewed'
              : 'Review all mappings to continue'}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={resolveMutation.isPending}
          >
            {resolveMutation.isPending ? 'Submitting...' : 'Submit Decisions'}
          </Button>
        </div>

        {resolveMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to submit decisions. Please try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function MappingRow({
  mapping,
  targetColumns,
  currentDecision,
  onDecisionChange,
}: {
  mapping: ColumnMapping;
  targetColumns: string[];
  currentDecision: string | null | undefined;
  onDecisionChange: (target: string | null) => void;
}) {
  const selectedValue =
    currentDecision !== undefined ? currentDecision : mapping.targetColumn;

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
            {mapping.sourceColumn}
          </code>
          <span className="text-muted-foreground">→</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="gap-1">
                  <HelpCircle className="h-3 w-3" />
                  {Math.round(mapping.confidence * 100)}% confidence
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Automatic mapping confidence score</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="secondary">{mapping.method}</Badge>
      </div>

      <Select
        value={selectedValue || '__unmapped__'}
        onValueChange={(v) => onDecisionChange(v === '__unmapped__' ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select target column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unmapped__">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Skip this column</span>
            </div>
          </SelectItem>
          {targetColumns.map((col) => (
            <SelectItem key={col} value={col}>
              <div className="flex items-center gap-2">
                {col === mapping.targetColumn && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                <span className="font-mono">{col}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {mapping.alternativeMappings && mapping.alternativeMappings.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <span>Alternatives: </span>
          {mapping.alternativeMappings.map((alt, i) => (
            <span key={alt.targetColumn}>
              {i > 0 && ', '}
              <button
                onClick={() => onDecisionChange(alt.targetColumn)}
                className="text-primary hover:underline font-mono"
              >
                {alt.targetColumn}
              </button>
              <span className="text-xs"> ({Math.round(alt.confidence * 100)}%)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
