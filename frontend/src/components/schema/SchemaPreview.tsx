import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CanonicalSchema, ColumnDefinition, Validator } from '@/types';

interface SchemaPreviewProps {
  schema: CanonicalSchema;
  compact?: boolean;
}

export function SchemaPreview({ schema, compact = false }: SchemaPreviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm sm:text-base">{schema.name}</span>
          <Badge variant="outline" className="text-xs">v{schema.version || '1.0.0'}</Badge>
        </CardTitle>
        {schema.description && (
          <p className="text-xs sm:text-sm text-muted-foreground">{schema.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn("pr-4", compact ? "h-[150px]" : "h-[250px] sm:h-[300px]")}>
          <div className="space-y-2">
            {schema.columns.map((column) => (
              <ColumnPreview key={column.name} column={column} compact={compact} />
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div>
            <span className="font-medium">{schema.columns.length}</span> columns
          </div>
          <div>
            Policy: <span className="font-medium">{schema.errorPolicy || 'flag'}</span>
          </div>
          {schema.strict && (
            <Badge variant="secondary" className="text-xs">
              Strict mode
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ColumnPreview({ column, compact }: { column: ColumnDefinition; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !compact && (
    column.description ||
    (column.aliases && column.aliases.length > 0) ||
    (column.validators && column.validators.length > 0) ||
    column.default !== undefined
  );

  return (
    <div className="rounded border bg-muted/30 overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-between p-2 sm:p-2.5",
          hasDetails && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {hasDetails && (
            expanded ? (
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            )
          )}
          <span className="font-mono text-xs sm:text-sm truncate">{column.name}</span>
          {column.required && (
            <span className="text-destructive text-xs">*</span>
          )}
          {column.description && !expanded && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground shrink-0 hidden sm:inline" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{column.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] sm:text-xs font-mono">
            {column.type}
          </Badge>
          {column.nullable && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex">
              null
            </Badge>
          )}
          {column.validators && column.validators.length > 0 && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex">
              {column.validators.length} rule{column.validators.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="px-2 sm:px-3 pb-2 sm:pb-3 pt-1 border-t bg-muted/20 space-y-2 text-xs">
          {column.description && (
            <p className="text-muted-foreground">{column.description}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {column.nullable && (
              <span className="sm:hidden">Nullable</span>
            )}
            {column.default !== undefined && (
              <span>
                Default: <code className="bg-background px-1 rounded">{String(column.default)}</code>
              </span>
            )}
            {column.dateFormat && (
              <span>
                Format: <code className="bg-background px-1 rounded">{column.dateFormat}</code>
              </span>
            )}
          </div>

          {column.aliases && column.aliases.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-muted-foreground">Aliases:</span>
              {column.aliases.map((alias) => (
                <Badge key={alias} variant="outline" className="text-[10px] font-mono">
                  {alias}
                </Badge>
              ))}
            </div>
          )}

          {column.validators && column.validators.length > 0 && (
            <div className="space-y-1">
              <span className="text-muted-foreground">Validators:</span>
              <div className="space-y-0.5">
                {column.validators.map((validator, idx) => (
                  <ValidatorDisplay key={idx} validator={validator} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ValidatorDisplay({ validator }: { validator: Validator }) {
  const getValidatorText = (): string => {
    switch (validator.type) {
      case 'regex':
        return `Regex: ${validator.pattern}`;
      case 'min':
        return `Min: ${validator.value}`;
      case 'max':
        return `Max: ${validator.value}`;
      case 'minLength':
        return `Min length: ${validator.value}`;
      case 'maxLength':
        return `Max length: ${validator.value}`;
      case 'enum':
        return `Allowed: ${validator.values.slice(0, 3).join(', ')}${validator.values.length > 3 ? '...' : ''}`;
      case 'unique':
        return 'Must be unique';
    }
  };

  return (
    <div className="flex items-center gap-2 text-[10px] sm:text-xs">
      <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
        {validator.type}
      </Badge>
      <span className="text-muted-foreground truncate">{getValidatorText()}</span>
    </div>
  );
}
