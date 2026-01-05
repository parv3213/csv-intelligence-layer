import { useState, useCallback } from 'react';
import { Download, Play, RotateCcw, History, ChevronDown, ChevronUp } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCreateIngestion, useIngestion, useDownloadOutput } from '@/hooks/useIngestion';
import type { SchemaResponse } from '@/types';

type PlaygroundStep = 'schema' | 'upload' | 'processing' | 'complete';

export function PlaygroundPage() {
  const [step, setStep] = useState<PlaygroundStep>('schema');
  const [selectedSchema, setSelectedSchema] = useState<SchemaResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentIngestionId, setCurrentIngestionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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
    setHistoryOpen(false);
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

      {/* Mobile History Toggle */}
      <div className="lg:hidden mb-4">
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Jobs
              </span>
              {historyOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <HistoryPanel
              onSelectEntry={handleHistorySelect}
              currentIngestionId={currentIngestionId}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

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
                <Button variant="ghost" onClick={() => setStep('schema')} className="text-sm">
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
                <div className="flex justify-end gap-2 sm:gap-3">
                  <Button
                    size="lg"
                    onClick={handleStartProcessing}
                    disabled={createIngestionMutation.isPending}
                    className="gap-2 w-full sm:w-auto"
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <Button variant="ghost" onClick={handleReset} className="text-sm">
                  ← Start New Job
                </Button>
                {isComplete && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => handleDownload('json')}
                      disabled={downloadMutation.isPending}
                      className="flex-1 sm:flex-none"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Download </span>JSON
                    </Button>
                    <Button
                      onClick={() => handleDownload('csv')}
                      disabled={downloadMutation.isPending}
                      className="flex-1 sm:flex-none"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Download </span>CSV
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
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div className="p-2 sm:p-0">
                        <p className="text-xl sm:text-2xl font-bold">{ingestion.rowCount ?? 0}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Rows</p>
                      </div>
                      <div className="p-2 sm:p-0">
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          {ingestion.validRowCount ?? 0}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Valid Rows</p>
                      </div>
                      <div className="p-2 sm:p-0">
                        <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                          {(ingestion.rowCount ?? 0) - (ingestion.validRowCount ?? 0)}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Issues</p>
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
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 rounded border bg-muted/30 text-sm gap-1 sm:gap-2"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono text-xs sm:text-sm bg-background px-1 py-0.5 rounded">
                              {mapping.sourceColumn}
                            </code>
                            <span className="text-muted-foreground">→</span>
                            <code className="font-mono text-xs sm:text-sm bg-background px-1 py-0.5 rounded">
                              {mapping.targetColumn || (
                                <span className="text-muted-foreground italic">
                                  unmapped
                                </span>
                              )}
                            </code>
                          </div>
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

        {/* Sidebar: History - Hidden on mobile, shown in collapsible above */}
        <div className="hidden lg:block space-y-6">
          <HistoryPanel
            onSelectEntry={handleHistorySelect}
            currentIngestionId={currentIngestionId}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
