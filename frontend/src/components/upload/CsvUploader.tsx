import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatBytes } from "@/lib/utils";
import { AlertCircle, FileSpreadsheet, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface CsvUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

export function CsvUploader({
  onFileSelect,
  selectedFile,
  onClear,
  disabled = false,
  maxSizeMB = 100,
}: CsvUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);

      // Check file extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "csv" && ext !== "tsv" && ext !== "txt") {
        setError("Please upload a CSV file (.csv, .tsv, or .txt)");
        return false;
      }

      // Check file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File size exceeds ${maxSizeMB}MB limit`);
        return false;
      }

      return true;
    },
    [maxSizeMB]
  );

  const loadPreview = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").slice(0, 5);
      setPreview(lines);
    };
    reader.readAsText(file.slice(0, 2048)); // Read first 2KB for preview
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelect(file);
        loadPreview(file);
      }
    },
    [validateFile, onFileSelect, loadPreview]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setPreview(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onClear();
  }, [onClear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload CSV
        </CardTitle>
        <CardDescription>
          Drag and drop your CSV file or click to browse
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                disabled={disabled}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {preview && (
              <div className="border rounded-lg overflow-hidden max-w-full">
                <div className="bg-muted px-3 py-2 text-xs text-muted-foreground border-b">
                  Preview (first 5 rows)
                </div>
                <div className="overflow-x-auto max-w-full">
                  <pre className="p-3 text-xs font-mono min-w-max">
                    {preview.map((line, i) => (
                      <div key={i} className="whitespace-nowrap">
                        {line}
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragOver && "dropzone-active border-primary bg-primary/5",
              disabled && "opacity-50 cursor-not-allowed",
              !isDragOver && !disabled && "hover:bg-accent/50"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled}
            />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium">
              {isDragOver ? "Drop your file here" : "Click or drag to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              CSV, TSV, or TXT files up to {maxSizeMB}MB
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
