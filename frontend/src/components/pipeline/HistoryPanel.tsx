import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHistoryRefresher } from "@/hooks/useHistoryRefresher";
import { useDownloadOutput } from "@/hooks/useIngestion";
import {
  formatRelativeTime,
  getStatusColor,
  getStatusLabel,
  truncateFilename,
} from "@/lib/utils";
import { useHistoryStore } from "@/stores/history";
import type { HistoryEntry } from "@/types";
import { Clock, Download, FileSpreadsheet, Trash2 } from "lucide-react";

interface HistoryPanelProps {
  onSelectEntry: (id: string) => void;
  currentIngestionId: string | null;
}

export function HistoryPanel({
  onSelectEntry,
  currentIngestionId,
}: HistoryPanelProps) {
  const { entries, removeEntry, clearHistory } = useHistoryStore();
  const downloadMutation = useDownloadOutput();

  // Refresh status of incomplete jobs
  useHistoryRefresher();

  const handleDownload = (entry: HistoryEntry) => {
    if (entry.status === "complete") {
      downloadMutation.mutate({
        id: entry.id,
        filename: entry.filename,
        format: "csv",
      });
    }
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Recent Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground text-sm">
            <p>No recent jobs yet.</p>
            <p>Upload a CSV to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Recent Jobs
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={clearHistory}>
            Clear
          </Button>
        </div>
        <CardDescription>{entries.length} job(s)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4 pt-0">
            {entries.map((entry) => (
              <HistoryEntryCard
                key={entry.id}
                entry={entry}
                isSelected={currentIngestionId === entry.id}
                onSelect={() => onSelectEntry(entry.id)}
                onRemove={() => removeEntry(entry.id)}
                onDownload={() => handleDownload(entry)}
                isDownloading={downloadMutation.isPending}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function HistoryEntryCard({
  entry,
  isSelected,
  onSelect,
  onRemove,
  onDownload,
  isDownloading,
}: {
  entry: HistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  return (
    <div
      className={`p-3 border rounded-lg transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button onClick={onSelect} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">
              {truncateFilename(entry.filename, 25)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={`text-xs ${getStatusColor(entry.status)}`}
            >
              {getStatusLabel(entry.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(entry.createdAt)}
            </span>
          </div>
          {entry.rowCount !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              {entry.validRowCount ?? 0}/{entry.rowCount} valid rows
            </p>
          )}
        </button>

        <div className="flex items-center gap-1">
          {entry.status === "complete" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              disabled={isDownloading}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
