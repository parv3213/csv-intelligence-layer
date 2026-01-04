import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoryEntry, IngestionStatus } from '@/types';

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (entry: HistoryEntry) => void;
  updateEntry: (id: string, updates: Partial<HistoryEntry>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  getEntry: (id: string) => HistoryEntry | undefined;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry: HistoryEntry) =>
        set((state) => ({
          entries: [entry, ...state.entries].slice(0, 50), // Keep last 50 entries
        })),

      updateEntry: (id: string, updates: Partial<HistoryEntry>) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          ),
        })),

      removeEntry: (id: string) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        })),

      clearHistory: () => set({ entries: [] }),

      getEntry: (id: string) => get().entries.find((entry) => entry.id === id),
    }),
    {
      name: 'csv-intelligence-history',
    }
  )
);

// Preferences store for theme and other settings
interface PreferencesState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  debugMode: boolean;
  toggleDebugMode: () => void;
  pollingInterval: number;
  setPollingInterval: (interval: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      debugMode: false,
      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
      pollingInterval: 2000,
      setPollingInterval: (pollingInterval) => set({ pollingInterval }),
    }),
    {
      name: 'csv-intelligence-preferences',
    }
  )
);

// Helper to create a new history entry
export function createHistoryEntry(
  id: string,
  filename: string,
  schemaName: string,
  schemaId: string | null
): HistoryEntry {
  return {
    id,
    filename,
    schemaName,
    schemaId,
    status: 'pending' as IngestionStatus,
    createdAt: new Date().toISOString(),
    completedAt: null,
    rowCount: null,
    validRowCount: null,
  };
}
