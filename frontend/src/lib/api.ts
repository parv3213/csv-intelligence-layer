import type {
  SchemaResponse,
  CanonicalSchema,
  IngestionResponse,
  CreateIngestionResponse,
  PendingReviewResponse,
  MappingDecision,
  DecisionLog,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.error || body.message || `HTTP ${response.status}`,
      body
    );
  }
  return response.json();
}

// Schema endpoints
export async function createSchema(schema: CanonicalSchema): Promise<SchemaResponse> {
  const response = await fetch(`${API_BASE}/schemas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schema),
  });
  return handleResponse<SchemaResponse>(response);
}

export async function listSchemas(): Promise<SchemaResponse[]> {
  const response = await fetch(`${API_BASE}/schemas`);
  return handleResponse<SchemaResponse[]>(response);
}

export async function getSchema(id: string): Promise<SchemaResponse> {
  const response = await fetch(`${API_BASE}/schemas/${id}`);
  return handleResponse<SchemaResponse>(response);
}

export async function deleteSchema(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/schemas/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error || 'Failed to delete schema');
  }
}

// Ingestion endpoints
export async function createIngestion(
  file: File,
  schemaId: string
): Promise<CreateIngestionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/ingestions?schemaId=${schemaId}`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<CreateIngestionResponse>(response);
}

export async function getIngestion(id: string): Promise<IngestionResponse> {
  const response = await fetch(`${API_BASE}/ingestions/${id}`);
  return handleResponse<IngestionResponse>(response);
}

export async function getIngestionReview(id: string): Promise<PendingReviewResponse> {
  const response = await fetch(`${API_BASE}/ingestions/${id}/review`);
  return handleResponse<PendingReviewResponse>(response);
}

export async function resolveIngestion(
  id: string,
  decisions: MappingDecision[]
): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE}/ingestions/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions }),
  });
  return handleResponse<{ status: string; message: string }>(response);
}

export async function getIngestionDecisions(id: string): Promise<DecisionLog[]> {
  const response = await fetch(`${API_BASE}/ingestions/${id}/decisions`);
  return handleResponse<DecisionLog[]>(response);
}

export async function downloadIngestionOutput(
  id: string,
  format: 'csv' | 'json' = 'csv'
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/ingestions/${id}/output?format=${format}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error || 'Failed to download output');
  }
  return response.blob();
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { ApiError };
