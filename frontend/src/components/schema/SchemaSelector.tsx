import { useState } from 'react';
import { useSchemas, useCreateSchema } from '@/hooks/useSchemas';
import { schemaTemplates, type SchemaTemplate } from '@/lib/templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Plus, FileCode, Layers } from 'lucide-react';
import type { SchemaResponse, CanonicalSchema } from '@/types';
import { SchemaEditor } from './SchemaEditor';

interface SchemaSelectorProps {
  selectedSchemaId: string | null;
  onSelectSchema: (schema: SchemaResponse) => void;
}

export function SchemaSelector({ selectedSchemaId, onSelectSchema }: SchemaSelectorProps) {
  const { data: schemas, isLoading, error } = useSchemas();
  const createSchemaMutation = useCreateSchema();
  const [tab, setTab] = useState<'templates' | 'saved' | 'custom'>('templates');
  const [customSchema, setCustomSchema] = useState<CanonicalSchema | null>(null);
  const [customSchemaError, setCustomSchemaError] = useState<string | null>(null);

  const handleTemplateSelect = async (template: SchemaTemplate) => {
    try {
      const response = await createSchemaMutation.mutateAsync(template.schema);
      onSelectSchema(response);
    } catch (err) {
      console.error('Failed to create schema from template:', err);
    }
  };

  const handleCustomSchemaSubmit = async () => {
    if (!customSchema) {
      setCustomSchemaError('Please enter a valid schema');
      return;
    }
    try {
      setCustomSchemaError(null);
      const response = await createSchemaMutation.mutateAsync(customSchema);
      onSelectSchema(response);
    } catch (err) {
      setCustomSchemaError(err instanceof Error ? err.message : 'Failed to create schema');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Schema
        </CardTitle>
        <CardDescription>
          Define the target schema for your CSV data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <div className="grid gap-3">
              {schemaTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateSelect(template)}
                  isLoading={createSchemaMutation.isPending}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>Failed to load schemas</AlertDescription>
              </Alert>
            ) : schemas && schemas.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {schemas.map((schema) => (
                    <SavedSchemaCard
                      key={schema.id}
                      schema={schema}
                      isSelected={selectedSchemaId === schema.id}
                      onSelect={() => onSelectSchema(schema)}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No saved schemas yet.</p>
                <p className="text-sm">Create one from a template or custom JSON.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <SchemaEditor
              onChange={(schema, isValid) => {
                setCustomSchema(isValid ? schema : null);
                if (!isValid) {
                  setCustomSchemaError('Invalid schema JSON');
                } else {
                  setCustomSchemaError(null);
                }
              }}
            />
            {customSchemaError && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>{customSchemaError}</AlertDescription>
              </Alert>
            )}
            <Button
              className="mt-4 w-full"
              onClick={handleCustomSchemaSubmit}
              disabled={!customSchema || createSchemaMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Schema
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TemplateCard({
  template,
  onSelect,
  isLoading,
}: {
  template: SchemaTemplate;
  onSelect: () => void;
  isLoading: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className="w-full text-left p-4 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{template.icon}</span>
            <h4 className="font-medium">{template.name}</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {template.schema.columns.slice(0, 4).map((col) => (
              <Badge key={col.name} variant="secondary" className="text-xs">
                {col.name}
              </Badge>
            ))}
            {template.schema.columns.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{template.schema.columns.length - 4} more
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function SavedSchemaCard({
  schema,
  isSelected,
  onSelect,
}: {
  schema: SchemaResponse;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 border rounded-lg transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">{schema.name}</h4>
            <Badge variant="outline" className="text-xs">
              v{schema.version}
            </Badge>
          </div>
          {schema.description && (
            <p className="text-sm text-muted-foreground mt-1">{schema.description}</p>
          )}
          <div className="flex gap-1 mt-2 flex-wrap">
            {schema.definition.columns.slice(0, 3).map((col) => (
              <Badge key={col.name} variant="secondary" className="text-xs">
                {col.name}
              </Badge>
            ))}
            {schema.definition.columns.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{schema.definition.columns.length - 3}
              </Badge>
            )}
          </div>
        </div>
        {isSelected && <Check className="h-5 w-5 text-primary" />}
      </div>
    </button>
  );
}
