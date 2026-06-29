'use client';

// Local-storage backed favorites for algs. Each entry keeps the alg and a learning
// status; the saved-list UI is handled elsewhere. Exposed as an external store via
// useSyncExternalStore so reads stay in sync across tabs and components without a hydration
// guard (the server snapshot is always empty, matching the first client render).

import { useCallback, useSyncExternalStore } from 'react';

export type AlgStatus = 'learning' | 'learned' | 'none';

export interface FavoriteAlg {
  alg: string;
  status: AlgStatus;
  // manual algset description override (max 6 chars). Absent = use the detected algset.
  algset?: string;
}

const STORAGE_KEY = 'ao1k.algFavorites';
const DEFAULT_STATUS: AlgStatus = 'learning';

// stable empty reference for the server snapshot and parse failures
const EMPTY: FavoriteAlg[] = [];

// cache the parsed value keyed by its raw string so getSnapshot returns a stable reference
// until local storage actually changes (re-parsing each call would loop the store)
let cachedRaw: string | null = null;
let cachedValue: FavoriteAlg[] = EMPTY;

const read = (): FavoriteAlg[] => {
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
    const parsed = raw ? JSON.parse(raw) : EMPTY;
    cachedValue = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
};

const listeners = new Set<() => void>();

const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
};

const getServerSnapshot = (): FavoriteAlg[] => EMPTY;

const write = (favorites: FavoriteAlg[]) => {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify(favorites);
  window.localStorage.setItem(STORAGE_KEY, raw);
  // refresh the cache and notify same-tab subscribers (the storage event only fires cross-tab)
  cachedRaw = raw;
  cachedValue = favorites;
  listeners.forEach((l) => l());
};

const toggle = (favorites: FavoriteAlg[], alg: string): FavoriteAlg[] =>
  favorites.some((f) => f.alg === alg)
    ? favorites.filter((f) => f.alg !== alg)
    : [...favorites, { alg, status: DEFAULT_STATUS }];

// add without toggling: a no-op if the alg is already saved
const add = (favorites: FavoriteAlg[], alg: string): FavoriteAlg[] =>
  favorites.some((f) => f.alg === alg)
    ? favorites
    : [...favorites, { alg, status: DEFAULT_STATUS }];

const setStatus = (favorites: FavoriteAlg[], alg: string, status: AlgStatus): FavoriteAlg[] =>
  favorites.map((f) => (f.alg === alg ? { ...f, status } : f));

// set (or clear, when blank) the manual algset override for an alg
const setAlgset = (favorites: FavoriteAlg[], alg: string, algset: string): FavoriteAlg[] =>
  favorites.map((f) => (f.alg === alg ? { ...f, algset: algset || undefined } : f));

const remove = (favorites: FavoriteAlg[], alg: string): FavoriteAlg[] =>
  favorites.filter((f) => f.alg !== alg);

/**
 * Reads favorites from local storage and keeps them in sync across tabs and components.
 * Returns the current list plus helpers to favorite, add, restatus, and delete an alg.
 */
export function useAlgFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const toggleFavorite = useCallback((alg: string) => write(toggle(read(), alg)), []);
  const addFavorite = useCallback((alg: string) => write(add(read(), alg)), []);
  const setFavoriteStatus = useCallback((alg: string, status: AlgStatus) => write(setStatus(read(), alg, status)), []);
  const setFavoriteAlgset = useCallback((alg: string, algset: string) => write(setAlgset(read(), alg, algset)), []);
  const removeFavorite = useCallback((alg: string) => write(remove(read(), alg)), []);

  const isFavorite = useCallback((alg: string) => favorites.some((f) => f.alg === alg), [favorites]);

  return { favorites, isFavorite, toggleFavorite, addFavorite, setFavoriteStatus, setFavoriteAlgset, removeFavorite };
}
