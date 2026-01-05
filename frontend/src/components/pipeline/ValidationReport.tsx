import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ValidationResult } from "@/types";
import { CheckCircle2, XCircle } from "lucide-react";

interface ValidationReportProps {
  validationResult: ValidationResult;
}

export function ValidationReport({ validationResult }: ValidationReportProps) {
  const { validRowCount, invalidRowCount, errors, errorsByColumn } =
    validationResult;

  if (invalidRowCount === 0 && errors.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
        <CardContent className="pt-6 flex items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              Validation Passed
            </h3>
            <p className="text-green-700 dark:text-green-300">
              All {validRowCount} rows are valid.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Validation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{invalidRowCount}</span>
              <span className="text-muted-foreground text-sm">
                invalid rows
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              out of {validRowCount + invalidRowCount} total rows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Top Issues by Column
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(errorsByColumn).map(([column, count]) => (
                <Badge key={column} variant="secondary" className="flex gap-1">
                  <span className="font-semibold">{column}:</span>
                  <span>{count}</span>
                </Badge>
              ))}
              {Object.keys(errorsByColumn).length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No column specific errors
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Error Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {errors.map((rowError, index) => (
                <div key={index} className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Row {rowError.row}</Badge>
                    <Badge
                      variant={
                        rowError.action === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {rowError.action}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {rowError.errors.map((cellError, cellIndex) => (
                      <div
                        key={cellIndex}
                        className="text-sm grid grid-cols-[1fr_auto] gap-2 items-start"
                      >
                        <div>
                          <span className="font-semibold text-foreground">
                            {cellError.column}:{" "}
                          </span>
                          <span className="text-muted-foreground">
                            {cellError.message}
                          </span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Value:{" "}
                            <code className="bg-muted px-1 py-0.5 rounded">
                              {String(cellError.value)}
                            </code>{" "}
                            (Expected: {cellError.expectedType})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
