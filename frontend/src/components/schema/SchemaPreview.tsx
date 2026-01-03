import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CanonicalSchema, ColumnDefinition } from '@/types';

interface SchemaPreviewProps {
  schema: CanonicalSchema;
}

export function SchemaPreview({ schema }: SchemaPreviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{schema.name}</span>
          <Badge variant="outline">v{schema.version || '1.0.0'}</Badge>
        </CardTitle>
        {schema.description && (
          <p className="text-sm text-muted-foreground">{schema.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {schema.columns.map((column) => (
              <ColumnPreview key={column.name} column={column} />
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4 pt-4 border-t flex gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">{schema.columns.length}</span> columns
          </div>
          <div>
            Error policy: <span className="font-medium">{schema.errorPolicy || 'flag'}</span>
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

function ColumnPreview({ column }: { column: ColumnDefinition }) {
  return (
    <div className="flex items-center justify-between p-2 rounded border bg-muted/30">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{column.name}</span>
        {column.required && (
          <span className="text-destructive text-xs">*</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-mono">
          {column.type}
        </Badge>
        {column.nullable && (
          <Badge variant="secondary" className="text-xs">
            nullable
          </Badge>
        )}
      </div>
    </div>
  );
}
