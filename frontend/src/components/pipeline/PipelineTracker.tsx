import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { IngestionResponse, IngestionStatus } from "@/types";
import {
  AlertCircle,
  ArrowRightLeft,
  Check,
  Clock,
  FileOutput,
  FileSearch,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useMemo } from "react";

interface PipelineTrackerProps {
  ingestion: IngestionResponse | null;
  isLoading: boolean;
}

interface StageInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  statusKey: IngestionStatus[];
}

const stages: StageInfo[] = [
  {
    id: "parse",
    name: "Parse",
    icon: <FileSearch className="h-4 w-4" />,
    description: "Detect delimiter, parse CSV structure",
    statusKey: ["parsing"],
  },
  {
    id: "infer",
    name: "Infer",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Detect column types from data",
    statusKey: ["inferring"],
  },
  {
    id: "map",
    name: "Map",
    icon: <ArrowRightLeft className="h-4 w-4" />,
    description: "Match source columns to schema",
    statusKey: ["mapping", "awaiting_review"],
  },
  {
    id: "validate",
    name: "Validate",
    icon: <ShieldCheck className="h-4 w-4" />,
    description: "Apply type coercion and validators",
    statusKey: ["validating"],
  },
  {
    id: "output",
    name: "Output",
    icon: <FileOutput className="h-4 w-4" />,
    description: "Generate processed output file",
    statusKey: ["outputting", "complete"],
  },
];

function getStageStatus(
  stageStatusKeys: IngestionStatus[],
  currentStatus: IngestionStatus | undefined
): "pending" | "running" | "complete" | "failed" | "review" {
  if (!currentStatus) return "pending";
  if (currentStatus === "failed") return "failed";
  if (
    currentStatus === "awaiting_review" &&
    stageStatusKeys.includes("awaiting_review")
  ) {
    return "review";
  }

  const allStatuses: IngestionStatus[] = [
    "pending",
    "parsing",
    "inferring",
    "mapping",
    "awaiting_review",
    "validating",
    "outputting",
    "complete",
  ];

  const currentIndex = allStatuses.indexOf(currentStatus);
  const stageStartIndex = allStatuses.findIndex((s) =>
    stageStatusKeys.includes(s)
  );
  const stageEndIndex = Math.max(
    ...stageStatusKeys.map((s) => allStatuses.indexOf(s))
  );

  if (currentIndex > stageEndIndex) return "complete";
  if (currentStatus === "complete" && stageStatusKeys.includes("complete"))
    return "complete";
  if (currentIndex >= stageStartIndex && currentIndex <= stageEndIndex)
    return "running";
  return "pending";
}

export function PipelineTracker({
  ingestion,
  isLoading,
}: PipelineTrackerProps) {
  const progress = useMemo(() => {
    if (!ingestion) return 0;
    const statusIndex = [
      "pending",
      "parsing",
      "inferring",
      "mapping",
      "awaiting_review",
      "validating",
      "outputting",
      "complete",
    ].indexOf(ingestion.status);
    return Math.round((statusIndex / 7) * 100);
  }, [ingestion]);

  if (isLoading && !ingestion) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading pipeline status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ingestion) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pipeline Progress</span>
          <StatusBadge status={ingestion.status} />
        </CardTitle>
        <CardDescription>
          {ingestion.originalFilename && (
            <span className="font-mono text-sm">
              {ingestion.originalFilename}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={progress} className="h-2" />

        <div className="space-y-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.statusKey, ingestion.status);
            return (
              <StageRow
                key={stage.id}
                stage={stage}
                status={status}
                isLast={index === stages.length - 1}
                ingestion={ingestion}
              />
            );
          })}
        </div>

        {ingestion.status === "complete" && ingestion.validationResult && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Rows</p>
                <p className="text-2xl font-bold">{ingestion.rowCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valid Rows</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {ingestion.validRowCount}
                </p>
              </div>
            </div>
          </div>
        )}

        {ingestion.status === "failed" && ingestion.error && (
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/50">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Pipeline Failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {ingestion.error}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StageRow({
  stage,
  status,
  isLast,
  ingestion,
}: {
  stage: StageInfo;
  status: "pending" | "running" | "complete" | "failed" | "review";
  isLast: boolean;
  ingestion: IngestionResponse;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border-2",
            status === "complete" &&
              "bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30 dark:text-green-400",
            status === "running" &&
              "bg-blue-100 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse-subtle",
            status === "review" &&
              "bg-yellow-100 border-yellow-500 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
            status === "failed" &&
              "bg-red-100 border-red-500 text-red-600 dark:bg-red-900/30 dark:text-red-400",
            status === "pending" &&
              "bg-muted border-muted-foreground/30 text-muted-foreground"
          )}
        >
          {status === "complete" ? (
            <Check className="h-4 w-4" />
          ) : status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "review" ? (
            <UserCheck className="h-4 w-4" />
          ) : status === "failed" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 h-8 mt-1",
              status === "complete" ? "bg-green-500" : "bg-border"
            )}
          />
        )}
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2">
          {stage.icon}
          <span className="font-medium">{stage.name}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {stage.description}
        </p>
        {stage.id === "map" && status === "review" && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
            Requires human review for ambiguous mappings
          </p>
        )}
        {stage.id === "infer" &&
          status === "complete" &&
          ingestion.inferredSchema && (
            <p className="text-xs text-muted-foreground mt-1">
              Detected {ingestion.inferredSchema.columns.length} columns,{" "}
              {ingestion.inferredSchema.rowCount} rows
            </p>
          )}
        {stage.id === "validate" &&
          status === "complete" &&
          ingestion.validationResult && (
            <p className="text-xs text-muted-foreground mt-1">
              {ingestion.validationResult.invalidRowCount > 0
                ? `${ingestion.validationResult.invalidRowCount} rows with issues`
                : "All rows valid"}
            </p>
          )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: IngestionStatus }) {
  const variants: Record<
    IngestionStatus,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      className?: string;
      label: string;
    }
  > = {
    pending: { variant: "secondary", label: "Pending" },
    parsing: {
      variant: "secondary",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      label: "Parsing",
    },
    inferring: {
      variant: "secondary",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      label: "Inferring",
    },
    mapping: {
      variant: "secondary",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      label: "Mapping",
    },
    awaiting_review: {
      variant: "secondary",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      label: "Review Required",
    },
    validating: {
      variant: "secondary",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      label: "Validating",
    },
    outputting: {
      variant: "secondary",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      label: "Outputting",
    },
    complete: {
      variant: "secondary",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      label: "Complete",
    },
    failed: { variant: "destructive", label: "Failed" },
  };

  const { variant, className, label } = variants[status] || {
    variant: "secondary",
    label: status,
  };

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
