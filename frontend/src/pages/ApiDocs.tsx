import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ApiDocsPage() {
  const [swaggerUrl, setSwaggerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to determine the API base URL
    const apiBase = import.meta.env.VITE_API_BASE || window.location.origin;
    const docsUrl = `${apiBase}/docs`;
    setSwaggerUrl(docsUrl);
  }, []);

  const handleOpenExternal = () => {
    if (swaggerUrl) {
      window.open(swaggerUrl, '_blank');
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="API Documentation"
        description="Interactive API reference powered by Swagger UI"
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">REST API</h3>
                <p className="text-sm text-muted-foreground">
                  The backend provides a complete REST API for all operations
                </p>
              </div>
              <Button variant="outline" onClick={handleOpenExternal}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>

            {swaggerUrl ? (
              <div className="border rounded-lg overflow-hidden" style={{ height: '70vh' }}>
                <iframe
                  src={swaggerUrl}
                  title="API Documentation"
                  className="w-full h-full"
                  onError={() => setError('Failed to load Swagger UI')}
                />
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Loading API documentation...
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>
                  {error}. Make sure the backend server is running.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Quick Reference</h3>
            <div className="space-y-4">
              <EndpointRow
                method="POST"
                path="/schemas"
                description="Create a new canonical schema"
              />
              <EndpointRow
                method="GET"
                path="/schemas"
                description="List all schemas"
              />
              <EndpointRow
                method="GET"
                path="/schemas/:id"
                description="Get schema by ID"
              />
              <EndpointRow
                method="DELETE"
                path="/schemas/:id"
                description="Delete a schema"
              />
              <div className="border-t pt-4" />
              <EndpointRow
                method="POST"
                path="/ingestions?schemaId=..."
                description="Upload CSV and start processing"
              />
              <EndpointRow
                method="GET"
                path="/ingestions/:id"
                description="Get ingestion status and details"
              />
              <EndpointRow
                method="GET"
                path="/ingestions/:id/review"
                description="Get pending review data"
              />
              <EndpointRow
                method="POST"
                path="/ingestions/:id/resolve"
                description="Submit human review decisions"
              />
              <EndpointRow
                method="GET"
                path="/ingestions/:id/decisions"
                description="Get decision audit log"
              />
              <EndpointRow
                method="GET"
                path="/ingestions/:id/output"
                description="Download processed output"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

function EndpointRow({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="flex items-center gap-4">
      <span
        className={`px-2 py-1 rounded text-xs font-bold ${methodColors[method] || 'bg-gray-100'}`}
      >
        {method}
      </span>
      <code className="font-mono text-sm flex-1">{path}</code>
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
  );
}
