'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type SidebarSide = 'left' | 'right';

export interface StatPlacement {
  visible: boolean;
  side: SidebarSide;
}

export type StatPlacements = Record<string, Partial<StatPlacement>>;

export type StatOptions = Record<string, Record<string, number>>;

export interface StatsSettings {
  placements: StatPlacements;
  options: StatOptions;
}

const STORAGE_KEY = 'ao1k.notimerStatsLayout';
export const STORE_VERSION = 1;

const EMPTY: StatsSettings = { placements: {}, options: {} };

const isSide = (value: unknown): value is SidebarSide => value === 'left' || value === 'right';

const sanitizePlacements = (raw: unknown): StatPlacements => {
  if (!raw || typeof raw !== 'object') return {};
  const clean: StatPlacements = {};
  for (const [id, placement] of Object.entries(raw as StatPlacements)) {
    if (!placement || typeof placement !== 'object') continue;
    const entry: Partial<StatPlacement> = {};
    if (typeof placement.visible === 'boolean') entry.visible = placement.visible;
    if (isSide(placement.side)) entry.side = placement.side;
    clean[id] = entry;
  }
  return clean;
};

const sanitizeOptions = (raw: unknown): StatOptions => {
  if (!raw || typeof raw !== 'object') return {};
  const clean: StatOptions = {};
  for (const [id, byKey] of Object.entries(raw as StatOptions)) {
    if (!byKey || typeof byKey !== 'object') continue;
    const entry: Record<string, number> = {};
    for (const [key, value] of Object.entries(byKey)) {
      if (Number.isFinite(value)) entry[key] = value;
    }
    clean[id] = entry;
  }
  return clean;
};

const sanitize = (parsed: unknown): StatsSettings => {
  if (!parsed || typeof parsed !== 'object') return EMPTY;
  const envelope = parsed as { version?: unknown; placements?: unknown; options?: unknown };
  if (envelope.version !== STORE_VERSION) return EMPTY;
  return {
    placements: sanitizePlacements(envelope.placements),
    options: sanitizeOptions(envelope.options),
  };
};

let cachedRaw: string | null = null;
let cachedValue: StatsSettings = EMPTY;

const read = (): StatsSettings => {
  if (typeof window === 'undefined') return EMPTY;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
};

const listeners = new Set<() => void>();

const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
};

const getServerSnapshot = (): StatsSettings => EMPTY;

const write = (settings: StatsSettings) => {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify({ version: STORE_VERSION, ...settings });
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    return;
  }
  cachedRaw = raw;
  cachedValue = settings;
  listeners.forEach((listener) => listener());
};

export function optionOf(
  options: StatOptions,
  elementId: string,
  key: string,
  fallback: number,
): number {
  return options[elementId]?.[key] ?? fallback;
}

export function useStatsLayout() {
  const settings = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const changePlacement = useCallback((id: string, change: Partial<StatPlacement>) => {
    const current = read();
    write({
      ...current,
      placements: { ...current.placements, [id]: { ...current.placements[id], ...change } },
    });
  }, []);

  const setVisible = useCallback(
    (id: string, visible: boolean) => changePlacement(id, { visible }),
    [changePlacement],
  );

  const setSide = useCallback(
    (id: string, side: SidebarSide) => changePlacement(id, { side }),
    [changePlacement],
  );

  const setOption = useCallback((id: string, key: string, value: number) => {
    const current = read();
    write({
      ...current,
      options: { ...current.options, [id]: { ...current.options[id], [key]: value } },
    });
  }, []);

  return { settings, setVisible, setSide, setOption };
}
