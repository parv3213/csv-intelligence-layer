import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  Layers,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Code,
  ExternalLink,
} from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export function DocsPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Documentation"
        description="Learn how to use CSV Intelligence Layer effectively"
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What is CSV Intelligence Layer?</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray dark:prose-invert max-w-none">
              <p>
                CSV Intelligence Layer is a <strong>deterministic data transformation pipeline</strong>
                that treats CSV files as "hostile input" and normalizes them against a canonical schema.
              </p>
              <p>
                Think of it as a <strong>compiler for messy data</strong>: you define what your clean
                data should look like, and the system transforms any CSV to match that specification.
              </p>

              <h3>Core Principles</h3>
              <ul>
                <li>
                  <strong>Schema-driven:</strong> Define your target structure once, then normalize
                  any CSV to match it.
                </li>
                <li>
                  <strong>Deterministic:</strong> Same input, same output, every time. No AI
                  hallucinations or random variations.
                </li>
                <li>
                  <strong>Explainable:</strong> Every transformation is logged and traceable.
                  You can see exactly what changed and why.
                </li>
                <li>
                  <strong>Human-in-the-loop:</strong> When mappings are ambiguous, the system
                  pauses for human review rather than guessing.
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Select or create a schema</p>
                    <p className="text-sm text-muted-foreground">
                      Use a template or define custom columns
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Upload your CSV</p>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop any CSV file
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Review and download</p>
                    <p className="text-sm text-muted-foreground">
                      See what changed, download clean data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  API Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  All functionality is available via REST API for automation.
                </p>
                <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                  <code>POST /schemas</code> - Create schema
                  <br />
                  <code>POST /ingestions</code> - Upload CSV
                  <br />
                  <code>GET /ingestions/:id</code> - Check status
                  <br />
                  <code>GET /ingestions/:id/output</code> - Download
                </div>
                <Link to="/api-docs" className="inline-flex items-center gap-1 text-sm text-primary mt-4 hover:underline">
                  View full API docs
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schemas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Schema Definition
              </CardTitle>
              <CardDescription>
                Schemas define the target structure for your normalized data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Column Types</h3>
                <div className="flex flex-wrap gap-2">
                  {['string', 'integer', 'float', 'boolean', 'date', 'datetime', 'email', 'uuid', 'url', 'json'].map((type) => (
                    <Badge key={type} variant="outline" className="font-mono">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Column Options</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">required</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Column must have a value
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">nullable</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Column can be null/empty
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">aliases</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Alternative column names to match
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">default</code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Value to use when missing
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Validators</h3>
                <div className="space-y-2">
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">regex</code>
                    <p className="text-sm text-muted-foreground">
                      Pattern matching validation
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">min / max</code>
                    <p className="text-sm text-muted-foreground">
                      Numeric range validation
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">minLength / maxLength</code>
                    <p className="text-sm text-muted-foreground">
                      String length validation
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <code className="text-sm font-mono">enum</code>
                    <p className="text-sm text-muted-foreground">
                      Allowed values list
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Error Policies</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <Badge variant="secondary" className="mb-2">flag</Badge>
                    <p className="text-sm text-muted-foreground">
                      Include row with error markers (default)
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="secondary" className="mb-2">reject_row</Badge>
                    <p className="text-sm text-muted-foreground">
                      Exclude rows with validation errors
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="secondary" className="mb-2">coerce_default</Badge>
                    <p className="text-sm text-muted-foreground">
                      Replace invalid values with defaults
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="secondary" className="mb-2">abort</Badge>
                    <p className="text-sm text-muted-foreground">
                      Stop processing on first error
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Stages</CardTitle>
              <CardDescription>
                Every CSV goes through 5 deterministic stages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">1. Parse</h3>
                  <p className="text-sm text-muted-foreground">
                    Auto-detect delimiter (comma, semicolon, tab, pipe). Parse CSV structure
                    and extract headers. Handle encoding detection and malformed rows.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">2. Infer</h3>
                  <p className="text-sm text-muted-foreground">
                    Sample data to detect column types. Uses voting algorithm across samples
                    to determine type with confidence score. Tracks null ratios and sample values.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 shrink-0">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">3. Map</h3>
                  <p className="text-sm text-muted-foreground">
                    Match source columns to target schema. Tries exact match, case-insensitive,
                    aliases, then fuzzy matching. Low-confidence mappings require human review.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">4. Validate</h3>
                  <p className="text-sm text-muted-foreground">
                    Apply type coercion to target types. Run validators (regex, min/max, enum).
                    Handle errors according to policy. Track validation statistics.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">5. Output</h3>
                  <p className="text-sm text-muted-foreground">
                    Transform rows to match schema column order. Format dates and normalize
                    values. Generate clean CSV or JSON output ready for download.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Human Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                When column mappings are ambiguous (confidence below 80% or multiple equally
                likely matches), the pipeline pauses for human review.
              </p>
              <p className="text-muted-foreground">
                You'll see the proposed mapping with alternatives, and can confirm or override
                each decision. Once resolved, processing continues automatically.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Example Schema</CardTitle>
              <CardDescription>E-commerce Orders schema</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono">
{`{
  "name": "E-commerce Orders",
  "version": "1.0.0",
  "columns": [
    {
      "name": "order_id",
      "type": "string",
      "required": true,
      "aliases": ["orderId", "order_number"]
    },
    {
      "name": "customer_email",
      "type": "email",
      "required": true,
      "aliases": ["email", "buyer_email"]
    },
    {
      "name": "amount",
      "type": "float",
      "required": true,
      "validators": [
        { "type": "min", "value": 0 }
      ]
    },
    {
      "name": "order_date",
      "type": "datetime",
      "required": true,
      "aliases": ["date", "created_at"]
    },
    {
      "name": "status",
      "type": "string",
      "validators": [
        {
          "type": "enum",
          "values": ["pending", "shipped", "delivered"]
        }
      ]
    }
  ],
  "errorPolicy": "flag"
}`}
              </pre>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-red-600">Bad Input</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
{`OrderNumber,Email,Total,Date,State
ORD-001,john@,99.99,2024-01-15,pending
ORD-002,jane@example.com,-50,invalid,SHIPPED
ORD-003,,100,2024-01-17,unknown`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-green-600">Clean Output</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
{`order_id,customer_email,amount,order_date,status
ORD-001,john@,99.99,2024-01-15T00:00:00.000Z,pending
ORD-002,jane@example.com,-50,,shipped
ORD-003,,100,2024-01-17T00:00:00.000Z,`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  * Rows flagged with validation errors for review
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
