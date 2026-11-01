'use client';

import { useSyncExternalStore } from 'react';

export interface EnabledColumns {
  icons: boolean;
  splits: boolean;
}

const ENABLED_COLUMNS_STORAGE_KEY = 'enabledColumns';

const DEFAULT_ENABLED_COLUMNS: EnabledColumns = {
  icons: true,
  splits: false,
};

function parseEnabledColumns(storedValue: string | null): EnabledColumns {
  if (!storedValue) return DEFAULT_ENABLED_COLUMNS;
  try {
    const parsed = JSON.parse(storedValue);
    return {
      icons: typeof parsed.icons === 'boolean' ? parsed.icons : DEFAULT_ENABLED_COLUMNS.icons,
      splits: typeof parsed.splits === 'boolean' ? parsed.splits : DEFAULT_ENABLED_COLUMNS.splits,
    };
  } catch {
    return DEFAULT_ENABLED_COLUMNS;
  }
}

const enabledColumnsListeners = new Set<() => void>();
let cachedStoredValue: string | null = null;
let cachedEnabledColumns: EnabledColumns | null = null;

function getEnabledColumnsSnapshot(): EnabledColumns {
  const storedValue = window.localStorage.getItem(ENABLED_COLUMNS_STORAGE_KEY);
  if (cachedEnabledColumns === null || storedValue !== cachedStoredValue) {
    cachedStoredValue = storedValue;
    cachedEnabledColumns = parseEnabledColumns(storedValue);
  }
  return cachedEnabledColumns;
}

function getServerEnabledColumnsSnapshot(): EnabledColumns {
  return DEFAULT_ENABLED_COLUMNS;
}

function notifyEnabledColumnsChanged() {
  enabledColumnsListeners.forEach(listener => listener());
}

function syncFromOtherTab(event: StorageEvent) {
  if (event.key === ENABLED_COLUMNS_STORAGE_KEY) notifyEnabledColumnsChanged();
}

function subscribeToEnabledColumns(listener: () => void): () => void {
  enabledColumnsListeners.add(listener);
  if (enabledColumnsListeners.size === 1) window.addEventListener('storage', syncFromOtherTab);

  return () => {
    enabledColumnsListeners.delete(listener);
    if (enabledColumnsListeners.size === 0) window.removeEventListener('storage', syncFromOtherTab);
  };
}

function updateEnabledColumns(change: Partial<EnabledColumns>) {
  const next = { ...getEnabledColumnsSnapshot(), ...change };
  window.localStorage.setItem(ENABLED_COLUMNS_STORAGE_KEY, JSON.stringify(next));
  notifyEnabledColumnsChanged();
}

export function useEnabledColumns() {
  const enabledColumns = useSyncExternalStore(subscribeToEnabledColumns, getEnabledColumnsSnapshot, getServerEnabledColumnsSnapshot);
  return [enabledColumns, updateEnabledColumns] as const;
}
