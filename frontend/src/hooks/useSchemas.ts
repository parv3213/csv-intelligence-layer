import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSchemas, createSchema, deleteSchema, getSchema } from '@/lib/api';
import type { CanonicalSchema, SchemaResponse } from '@/types';

export function useSchemas() {
  return useQuery<SchemaResponse[], Error>({
    queryKey: ['schemas'],
    queryFn: listSchemas,
    staleTime: 30000, // 30 seconds
  });
}

export function useSchema(id: string | null) {
  return useQuery<SchemaResponse, Error>({
    queryKey: ['schema', id],
    queryFn: () => getSchema(id!),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

export function useCreateSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schema: CanonicalSchema) => createSchema(schema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas'] });
    },
  });
}

export function useDeleteSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSchema(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas'] });
    },
  });
}
