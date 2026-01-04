import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function truncateFilename(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) return filename;
  const ext = filename.split('.').pop() || '';
  const name = filename.slice(0, filename.length - ext.length - 1);
  const truncatedName = name.slice(0, maxLength - ext.length - 4) + '...';
  return `${truncatedName}.${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'complete':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'failed':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'awaiting_review':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'pending':
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    default:
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'parsing':
      return 'Parsing';
    case 'inferring':
      return 'Inferring Types';
    case 'mapping':
      return 'Mapping Columns';
    case 'awaiting_review':
      return 'Awaiting Review';
    case 'validating':
      return 'Validating';
    case 'outputting':
      return 'Generating Output';
    case 'complete':
      return 'Complete';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}
