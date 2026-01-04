import { useState, useCallback } from 'react';
import { Download, Play, RotateCcw } from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/layout/PageWrapper';
import { SchemaSelector } from '@/components/schema/SchemaSelector';
import { SchemaPreview } from '@/components/schema/SchemaPreview';
import { CsvUploader } from '@/components/upload/CsvUploader';
import { PipelineTracker } from '@/components/pipeline/PipelineTracker';
import { ReviewPanel } from '@/components/pipeline/ReviewPanel';
import { HistoryPanel } from '@/components/pipeline/HistoryPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCreateIngestion, useIngestion, useDownloadOutput } from '@/hooks/useIngestion';
import type { SchemaResponse } from '@/types';

type PlaygroundStep = 'schema' | 'upload' | 'processing' | 'complete';

export function PlaygroundPage() {
  const [step, setStep] = useState<PlaygroundStep>('schema');
  const [selectedSchema, setSelectedSchema] = useState<SchemaResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentIngestionId, setCurrentIngestionId] = useState<string | null>(null);

  const createIngestionMutation = useCreateIngestion();
  const { data: ingestion, isLoading: isLoadingIngestion } = useIngestion(currentIngestionId);
  const downloadMutation = useDownloadOutput();

  const handleSchemaSelect = useCallback((schema: SchemaResponse) => {
    setSelectedSchema(schema);
    setStep('upload');
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleStartProcessing = useCallback(async () => {
    if (!selectedFile || !selectedSchema) return;

    try {
      const result = await createIngestionMutation.mutateAsync({
        file: selectedFile,
        schemaId: selectedSchema.id,
        schemaName: selectedSchema.name,
      });
      setCurrentIngestionId(result.id);
      setStep('processing');
    } catch (err) {
      console.error('Failed to start ingestion:', err);
    }
  }, [selectedFile, selectedSchema, createIngestionMutation]);

  const handleDownload = useCallback(
    (format: 'csv' | 'json' = 'csv') => {
      if (!currentIngestionId || !selectedFile) return;
      downloadMutation.mutate({
        id: currentIngestionId,
        filename: selectedFile.name,
        format,
      });
    },
    [currentIngestionId, selectedFile, downloadMutation]
  );

  const handleReset = useCallback(() => {
    setStep('schema');
    setSelectedSchema(null);
    setSelectedFile(null);
    setCurrentIngestionId(null);
  }, []);

  const handleHistorySelect = useCallback((id: string) => {
    setCurrentIngestionId(id);
    setStep('processing');
  }, []);

  const handleReviewResolved = useCallback(() => {
    // Refetch will happen automatically due to React Query
  }, []);

  const needsReview = ingestion?.status === 'awaiting_review';
  const isComplete = ingestion?.status === 'complete';
  const isFailed = ingestion?.status === 'failed';

  return (
    <PageWrapper>
      <PageHeader
        title="Playground"
        description="Upload and process CSV files against your schema"
      />

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          {/* Step 1: Schema Selection */}
          {step === 'schema' && (
            <SchemaSelector
              selectedSchemaId={selectedSchema?.id || null}
              onSelectSchema={handleSchemaSelect}
            />
          )}

          {/* Step 2: File Upload */}
          {step === 'upload' && selectedSchema && (
            <>
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep('schema')}>
                  ← Change Schema
                </Button>
              </div>

              <SchemaPreview schema={selectedSchema.definition} />

              <CsvUploader
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClear={handleClearFile}
                disabled={createIngestionMutation.isPending}
              />

              {selectedFile && (
                <div className="flex justify-end gap-3">
                  <Button
                    size="lg"
                    onClick={handleStartProcessing}
                    disabled={createIngestionMutation.isPending}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {createIngestionMutation.isPending
                      ? 'Starting...'
                      : 'Start Processing'}
                  </Button>
                </div>
              )}

              {createIngestionMutation.isError && (
                <Alert variant="destructive">
                  <AlertTitle>Upload Failed</AlertTitle>
                  <AlertDescription>
                    {createIngestionMutation.error?.message ||
                      'Failed to start processing'}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Step 3: Processing / Review / Complete */}
          {step === 'processing' && (
            <>
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={handleReset}>
                  ← Start New Job
                </Button>
                {isComplete && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDownload('json')}
                      disabled={downloadMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    <Button
                      onClick={() => handleDownload('csv')}
                      disabled={downloadMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                )}
                {isFailed && (
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>

              <PipelineTracker
                ingestion={ingestion || null}
                isLoading={isLoadingIngestion}
              />

              {needsReview && selectedSchema && currentIngestionId && (
                <ReviewPanel
                  ingestionId={currentIngestionId}
                  schema={selectedSchema}
                  onResolved={handleReviewResolved}
                />
              )}

              {isComplete && ingestion && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600 dark:text-green-400">
                      Processing Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{ingestion.rowCount}</p>
                        <p className="text-sm text-muted-foreground">Total Rows</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {ingestion.validRowCount}
                        </p>
                        <p className="text-sm text-muted-foreground">Valid Rows</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-600">
                          {(ingestion.rowCount || 0) - (ingestion.validRowCount || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Issues</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {ingestion?.mappingResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Column Mappings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ingestion.mappingResult.mappings.map((mapping) => (
                        <div
                          key={mapping.sourceColumn}
                          className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm"
                        >
                          <code className="font-mono">{mapping.sourceColumn}</code>
                          <span className="text-muted-foreground">→</span>
                          <code className="font-mono">
                            {mapping.targetColumn || (
                              <span className="text-muted-foreground italic">
                                unmapped
                              </span>
                            )}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            ({mapping.method})
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Sidebar: History */}
        <div className="space-y-6">
          <HistoryPanel
            onSelectEntry={handleHistorySelect}
            currentIngestionId={currentIngestionId}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
