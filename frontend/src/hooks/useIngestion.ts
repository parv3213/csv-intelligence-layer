import {
  createIngestion,
  downloadIngestionOutput,
  getIngestion,
  getIngestionDecisions,
  getIngestionReview,
  resolveIngestion,
  triggerDownload,
} from "@/lib/api";
import {
  createHistoryEntry,
  useHistoryStore,
  usePreferencesStore,
} from "@/stores/history";
import type {
  DecisionLog,
  IngestionResponse,
  MappingDecision,
  PendingReviewResponse,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useIngestion(id: string | null) {
  const { updateEntry } = useHistoryStore();
  const { pollingInterval } = usePreferencesStore();

  const query = useQuery<IngestionResponse, Error>({
    queryKey: ["ingestion", id],
    queryFn: () => getIngestion(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when complete or failed
      if (data?.status === "complete" || data?.status === "failed") {
        return false;
      }
      // Also stop polling when awaiting review
      if (data?.status === "awaiting_review") {
        return false;
      }
      return pollingInterval;
    },
  });

  // Update history when status changes
  useEffect(() => {
    const data = query.data;
    if (data) {
      if (data.status === "complete" || data.status === "failed") {
        updateEntry(data.id, {
          status: data.status,
          completedAt: data.completedAt,
          rowCount: data.rowCount,
          validRowCount: data.validRowCount,
        });
      } else if (data.status === "awaiting_review") {
        updateEntry(data.id, { status: data.status });
      }
    }
  }, [query.data, updateEntry]);

  return query;
}

export function useIngestionReview(id: string | null, enabled: boolean = true) {
  return useQuery<PendingReviewResponse, Error>({
    queryKey: ["ingestion-review", id],
    queryFn: () => getIngestionReview(id!),
    enabled: !!id && enabled,
  });
}

export function useIngestionDecisions(id: string | null) {
  return useQuery<DecisionLog[], Error>({
    queryKey: ["ingestion-decisions", id],
    queryFn: () => getIngestionDecisions(id!),
    enabled: !!id,
  });
}

export function useCreateIngestion() {
  const queryClient = useQueryClient();
  const { addEntry } = useHistoryStore();

  return useMutation({
    mutationFn: ({
      file,
      schemaId,
      schemaName,
    }: {
      file: File;
      schemaId: string;
      schemaName: string;
    }) =>
      createIngestion(file, schemaId).then((response) => ({
        ...response,
        filename: file.name,
        schemaName,
        schemaId,
      })),
    onSuccess: (data) => {
      // Add to history
      addEntry(
        createHistoryEntry(
          data.id,
          data.filename,
          data.schemaName,
          data.schemaId
        )
      );
      queryClient.invalidateQueries({ queryKey: ["ingestion", data.id] });
    },
  });
}

export function useResolveIngestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      decisions,
    }: {
      id: string;
      decisions: MappingDecision[];
    }) => resolveIngestion(id, decisions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ingestion", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["ingestion-review", variables.id],
      });
    },
  });
}

export function useDownloadOutput() {
  return useMutation({
    mutationFn: async ({
      id,
      filename,
      format = "csv",
    }: {
      id: string;
      filename: string;
      format?: "csv" | "json";
    }) => {
      const blob = await downloadIngestionOutput(id, format);
      const outputFilename = filename.replace(
        /\.[^.]+$/,
        `_processed.${format}`
      );
      triggerDownload(blob, outputFilename);
    },
  });
}
