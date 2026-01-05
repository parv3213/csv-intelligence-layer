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
  Calendar,
  Hash,
  Type,
  ToggleLeft,
  Mail,
  Link as LinkIcon,
  Braces,
  Key,
} from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const columnTypes = [
  { name: 'string', icon: <Type className="h-4 w-4" />, description: 'Text values, trimmed and normalized' },
  { name: 'integer', icon: <Hash className="h-4 w-4" />, description: 'Whole numbers (e.g., 42, -10, 0)' },
  { name: 'float', icon: <Hash className="h-4 w-4" />, description: 'Decimal numbers (e.g., 3.14, -0.5)' },
  { name: 'boolean', icon: <ToggleLeft className="h-4 w-4" />, description: 'true/false, yes/no, 1/0' },
  { name: 'date', icon: <Calendar className="h-4 w-4" />, description: 'Date only (YYYY-MM-DD)' },
  { name: 'datetime', icon: <Calendar className="h-4 w-4" />, description: 'Date and time (ISO 8601)' },
  { name: 'email', icon: <Mail className="h-4 w-4" />, description: 'Email addresses, validated format' },
  { name: 'uuid', icon: <Key className="h-4 w-4" />, description: 'UUID v4 format strings' },
  { name: 'url', icon: <LinkIcon className="h-4 w-4" />, description: 'Valid URL strings' },
  { name: 'json', icon: <Braces className="h-4 w-4" />, description: 'JSON objects or arrays' },
];

export function DocsPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Documentation"
        description="Learn how to use CSV Intelligence Layer effectively"
      />

      <Tabs defaultValue="overview" className="space-y-6">
        {/* Scrollable tabs for mobile */}
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-full sm:w-auto">
            <TabsTrigger value="overview" className="flex-shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="schemas" className="flex-shrink-0">Schemas</TabsTrigger>
            <TabsTrigger value="pipeline" className="flex-shrink-0">Pipeline</TabsTrigger>
            <TabsTrigger value="examples" className="flex-shrink-0">Examples</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>

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

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
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
                    <p className="font-medium text-sm sm:text-base">Select or create a schema</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Use a template or define custom columns
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Upload your CSV</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Drag and drop any CSV file
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Review and download</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      See what changed, download clean data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Code className="h-5 w-5" />
                  API Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  All functionality is available via REST API for automation.
                </p>
                <div className="p-2 sm:p-3 bg-muted rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                  <code>POST /schemas</code> - Create schema
                  <br />
                  <code>POST /ingestions</code> - Upload CSV
                  <br />
                  <code>GET /ingestions/:id</code> - Check status
                  <br />
                  <code>GET /ingestions/:id/output</code> - Download
                </div>
                <Link to="/api-docs" className="inline-flex items-center gap-1 text-xs sm:text-sm text-primary mt-4 hover:underline">
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
                <h3 className="font-semibold mb-3">Column Types</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Each column in your schema must have a type. The system will attempt to coerce
                  input values to match the target type.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
                  {columnTypes.map((type) => (
                    <div key={type.name} className="flex items-start gap-2 p-2 sm:p-3 border rounded-lg">
                      <div className="p-1.5 bg-primary/10 rounded text-primary shrink-0">
                        {type.icon}
                      </div>
                      <div className="min-w-0">
                        <code className="text-xs sm:text-sm font-mono font-semibold">{type.name}</code>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Column Options</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure how each column should be handled during processing.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 border rounded-lg space-y-2">
                    <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">required: boolean</code>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      If true, rows missing this column's value will be flagged as invalid.
                    </p>
                    <p className="text-xs text-muted-foreground/70">Default: false</p>
                  </div>
                  <div className="p-3 border rounded-lg space-y-2">
                    <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">nullable: boolean</code>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      If true, empty/null values are allowed even if required is true.
                    </p>
                    <p className="text-xs text-muted-foreground/70">Default: true</p>
                  </div>
                  <div className="p-3 border rounded-lg space-y-2">
                    <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">aliases: string[]</code>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Alternative column names to match (e.g., ["email", "e-mail", "Email Address"]).
                    </p>
                    <p className="text-xs text-muted-foreground/70">Default: []</p>
                  </div>
                  <div className="p-3 border rounded-lg space-y-2">
                    <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">default: any</code>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Value to use when the source is missing or null.
                    </p>
                    <p className="text-xs text-muted-foreground/70">Default: undefined</p>
                  </div>
                  <div className="p-3 border rounded-lg space-y-2">
                    <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">description: string</code>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Human-readable description for documentation purposes.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg space-y-2">
                    <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">dateFormat: string</code>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Expected date format for date/datetime columns (e.g., "MM/dd/yyyy").
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Validators</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add validation rules to enforce data quality constraints.
                </p>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">regex</code>
                      <Badge variant="outline" className="text-xs">pattern: string</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Validate string matches a regular expression pattern.
                    </p>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`{ "type": "regex", "pattern": "^[A-Z]{3}-\\\\d{3}$", "message": "Must be format XXX-000" }`}
                    </pre>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">min / max</code>
                      <Badge variant="outline" className="text-xs">value: number</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Validate numeric values fall within a range.
                    </p>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`{ "type": "min", "value": 0 }
{ "type": "max", "value": 100 }`}
                    </pre>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">minLength / maxLength</code>
                      <Badge variant="outline" className="text-xs">value: number</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Validate string length constraints.
                    </p>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`{ "type": "minLength", "value": 3 }
{ "type": "maxLength", "value": 50 }`}
                    </pre>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">enum</code>
                      <Badge variant="outline" className="text-xs">values: string[]</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Validate value is one of the allowed options.
                    </p>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`{ "type": "enum", "values": ["pending", "shipped", "delivered"] }`}
                    </pre>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">unique</code>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Ensure all values in this column are unique across the dataset.
                    </p>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`{ "type": "unique", "message": "Duplicate order ID found" }`}
                    </pre>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Error Policies</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Control how validation errors are handled at the schema level.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 border rounded-lg">
                    <Badge variant="default" className="mb-2">flag</Badge>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Include row in output with error markers. Best for reviewing data quality. <span className="text-primary">(default)</span>
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="secondary" className="mb-2">reject_row</Badge>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Exclude rows with validation errors from output. Best for strict data pipelines.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="secondary" className="mb-2">coerce_default</Badge>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Replace invalid values with column defaults. Best when defaults are acceptable.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Badge variant="destructive" className="mb-2">abort</Badge>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Stop processing on first error. Best for critical data imports.
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
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="flex gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                  <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">1. Parse</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Auto-detect delimiter (comma, semicolon, tab, pipe). Parse CSV structure
                    and extract headers. Handle encoding detection and malformed rows.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">2. Infer</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Sample data to detect column types. Uses voting algorithm across samples
                    to determine type with confidence score. Tracks null ratios and sample values.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 shrink-0">
                  <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">3. Map</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Match source columns to target schema. Tries exact match, case-insensitive,
                    aliases, then fuzzy matching. Low-confidence mappings require human review.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">4. Validate</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Apply type coercion to target types. Run validators (regex, min/max, enum).
                    Handle errors according to policy. Track validation statistics.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 shrink-0">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">5. Output</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Transform rows to match schema column order. Format dates and normalize
                    values. Generate clean CSV or JSON output ready for download.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Human Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                When column mappings are ambiguous (confidence below 80% or multiple equally
                likely matches), the pipeline pauses for human review.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
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
              <CardDescription>E-commerce Orders schema with validation</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <pre className="p-3 sm:p-4 bg-muted rounded-lg text-xs sm:text-sm font-mono min-w-[300px]">
{`{
  "name": "E-commerce Orders",
  "version": "1.0.0",
  "description": "Schema for order data normalization",
  "columns": [
    {
      "name": "order_id",
      "type": "string",
      "required": true,
      "description": "Unique order identifier",
      "aliases": ["orderId", "order_number", "OrderNum"],
      "validators": [
        { "type": "unique" }
      ]
    },
    {
      "name": "customer_email",
      "type": "email",
      "required": true,
      "description": "Customer's email address",
      "aliases": ["email", "buyer_email", "Email"]
    },
    {
      "name": "amount",
      "type": "float",
      "required": true,
      "description": "Order total amount",
      "aliases": ["total", "price", "Total"],
      "validators": [
        { "type": "min", "value": 0, "message": "Amount must be positive" }
      ]
    },
    {
      "name": "order_date",
      "type": "datetime",
      "required": true,
      "description": "When the order was placed",
      "aliases": ["date", "created_at", "Date", "OrderDate"],
      "dateFormat": "yyyy-MM-dd"
    },
    {
      "name": "status",
      "type": "string",
      "default": "pending",
      "description": "Current order status",
      "aliases": ["state", "order_status"],
      "validators": [
        {
          "type": "enum",
          "values": ["pending", "processing", "shipped", "delivered", "cancelled"],
          "message": "Invalid order status"
        }
      ]
    }
  ],
  "errorPolicy": "flag",
  "strict": false
}`}
                </pre>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-red-600 dark:text-red-400">Bad Input</CardTitle>
                <CardDescription>Messy CSV data</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <pre className="p-2 sm:p-3 bg-muted rounded-lg text-xs font-mono min-w-[280px]">
{`OrderNumber,Email,Total,Date,State
ORD-001,john@,99.99,2024-01-15,pending
ORD-002,jane@example.com,-50,invalid,SHIPPED
ORD-003,,100,2024-01-17,unknown
ORD-001,duplicate@test.com,50,2024-01-18,pending`}
                  </pre>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Issues detected:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Invalid email format (john@)</li>
                    <li>Negative amount (-50)</li>
                    <li>Invalid date format</li>
                    <li>Status not in allowed values</li>
                    <li>Duplicate order_id</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-green-600 dark:text-green-400">Clean Output</CardTitle>
                <CardDescription>Normalized data</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <pre className="p-2 sm:p-3 bg-muted rounded-lg text-xs font-mono min-w-[280px]">
{`order_id,customer_email,amount,order_date,status
ORD-001,john@,99.99,2024-01-15T00:00:00Z,pending
ORD-002,jane@example.com,-50,,shipped
ORD-003,,100,2024-01-17T00:00:00Z,pending
ORD-001,duplicate@test.com,50,2024-01-18T00:00:00Z,pending`}
                  </pre>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Transformations applied:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Column names normalized</li>
                    <li>Status case-normalized (SHIPPED → shipped)</li>
                    <li>Invalid status replaced with default</li>
                    <li>Dates converted to ISO 8601</li>
                    <li>Rows flagged (not rejected) for review</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
