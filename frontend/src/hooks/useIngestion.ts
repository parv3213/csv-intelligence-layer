import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createIngestion,
  getIngestion,
  getIngestionReview,
  resolveIngestion,
  getIngestionDecisions,
  downloadIngestionOutput,
  triggerDownload,
} from '@/lib/api';
import type {
  IngestionResponse,
  PendingReviewResponse,
  MappingDecision,
  DecisionLog,
} from '@/types';
import { useHistoryStore, createHistoryEntry } from '@/stores/history';
import { usePreferencesStore } from '@/stores/history';

export function useIngestion(id: string | null) {
  const { updateEntry } = useHistoryStore();
  const { pollingInterval } = usePreferencesStore();

  return useQuery<IngestionResponse, Error>({
    queryKey: ['ingestion', id],
    queryFn: () => getIngestion(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when complete or failed
      if (data?.status === 'complete' || data?.status === 'failed') {
        // Update history when done
        if (data) {
          updateEntry(data.id, {
            status: data.status,
            completedAt: data.completedAt,
            rowCount: data.rowCount,
            validRowCount: data.validRowCount,
          });
        }
        return false;
      }
      // Also stop polling when awaiting review
      if (data?.status === 'awaiting_review') {
        if (data) {
          updateEntry(data.id, { status: data.status });
        }
        return false;
      }
      return pollingInterval;
    },
  });
}

export function useIngestionReview(id: string | null, enabled: boolean = true) {
  return useQuery<PendingReviewResponse, Error>({
    queryKey: ['ingestion-review', id],
    queryFn: () => getIngestionReview(id!),
    enabled: !!id && enabled,
  });
}

export function useIngestionDecisions(id: string | null) {
  return useQuery<DecisionLog[], Error>({
    queryKey: ['ingestion-decisions', id],
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
        createHistoryEntry(data.id, data.filename, data.schemaName, data.schemaId)
      );
      queryClient.invalidateQueries({ queryKey: ['ingestion', data.id] });
    },
  });
}

export function useResolveIngestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decisions }: { id: string; decisions: MappingDecision[] }) =>
      resolveIngestion(id, decisions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ingestion', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ingestion-review', variables.id] });
    },
  });
}

export function useDownloadOutput() {
  return useMutation({
    mutationFn: async ({
      id,
      filename,
      format = 'csv',
    }: {
      id: string;
      filename: string;
      format?: 'csv' | 'json';
    }) => {
      const blob = await downloadIngestionOutput(id, format);
      const outputFilename = filename.replace(/\.[^.]+$/, `_processed.${format}`);
      triggerDownload(blob, outputFilename);
    },
  });
}
