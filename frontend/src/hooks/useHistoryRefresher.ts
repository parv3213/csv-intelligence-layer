import { getIngestion } from "@/lib/api";
import { useHistoryStore } from "@/stores/history";
import type { IngestionResponse } from "@/types";
import { useQueries, type Query } from "@tanstack/react-query";
import { useEffect } from "react";

export function useHistoryRefresher() {
  const { entries, updateEntry } = useHistoryStore();

  // Filter incomplete entries that need monitoring
  // We monitor pending, parsing, inferring, mapping, validating, outputting
  // We don't monitor complete, failed, or awaiting_review (unless we want to detect if review was done elsewhere)
  const incompleteEntries = entries.filter(
    (entry) =>
      entry.status !== "complete" &&
      entry.status !== "failed" &&
      entry.status !== "awaiting_review"
  );

  const results = useQueries({
    queries: incompleteEntries.map((entry) => ({
      queryKey: ["ingestion", entry.id],
      queryFn: () => getIngestion(entry.id),
      refetchInterval: (
        query: Query<IngestionResponse, Error, IngestionResponse, unknown[]>
      ) => {
        const data = query.state.data;
        if (
          data?.status === "complete" ||
          data?.status === "failed" ||
          data?.status === "awaiting_review"
        ) {
          return false;
        }
        return 5000; // Poll every 5 seconds
      },
    })),
  });

  useEffect(() => {
    results.forEach((result, index) => {
      const entry = incompleteEntries[index];
      const data = result.data;

      if (data && data.status !== entry.status) {
        updateEntry(entry.id, {
          status: data.status,
          completedAt: data.completedAt,
          rowCount: data.rowCount,
          validRowCount: data.validRowCount,
        });
      }
    });
  }, [results, incompleteEntries, updateEntry]);
}
