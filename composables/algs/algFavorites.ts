'use client';

// Local-storage backed favorites for algs. Each entry keeps the alg and a learning
// status; the saved-list UI is handled elsewhere. Exposed as an external store via
// useSyncExternalStore so reads stay in sync across tabs and components without a hydration
// guard (the server snapshot is always empty, matching the first client render).
//
// Persisted as a versioned envelope ({ version, favorites }) so the stored shape can evolve;
// on read, older shapes are migrated forward to the current version (see migrate).

import { useCallback, useSyncExternalStore } from 'react';
import type { Algset } from '../recon/SimpleCubeInterpreter';
import { splitLeadingAuf } from '../../utils/collapseAufVariants';

export type AlgStatus = 'learning' | 'learned' | 'none';

export interface FavoriteAlg {
  alg: string;
  status: AlgStatus;
  // manual algset description override (max 6 chars). Absent = use the detected algset.
  algset?: string;
  // the algset the alg was suggested from; the case name is derived from it, never stored
  sourceAlgset?: Algset;
}

interface FavoritesEnvelope {
  version: number;
  favorites: FavoriteAlg[];
}

const STORAGE_KEY = 'ao1k.algFavorites';
const DEFAULT_STATUS: AlgStatus = 'learning';
export const STORE_VERSION = 1;

// stable empty reference for the server snapshot and parse failures
const EMPTY: FavoriteAlg[] = [];

// forward migrations keyed by the version they upgrade from. To change the stored shape, bump
// STORE_VERSION and add the step that turns version N favorites into version N+1 favorites.
const MIGRATIONS: Record<number, (favorites: FavoriteAlg[]) => FavoriteAlg[]> = {};

// runs the migration steps from fromVersion up to STORE_VERSION. The CSV import reads a version
// out of the file and calls this too, so both it and local storage share one set of steps.
export const migrateFavorites = (favorites: FavoriteAlg[], fromVersion: number): FavoriteAlg[] => {
  let version = fromVersion;
  let migrated = favorites;
  while (version < STORE_VERSION) {
    const step = MIGRATIONS[version];
    if (step) migrated = step(migrated);
    version += 1;
  }
  return migrated;
};

const isEnvelope = (value: unknown): value is FavoritesEnvelope =>
  !!value && typeof value === 'object' && !Array.isArray(value) &&
  Array.isArray((value as FavoritesEnvelope).favorites);

// bring any stored shape up to STORE_VERSION. A bare array is the pre-versioning format, read as
// version 0; a valid envelope carries its own version; anything else is discarded as empty.
const migrate = (parsed: unknown): FavoriteAlg[] => {
  let version: number;
  let favorites: FavoriteAlg[];
  if (isEnvelope(parsed)) {
    version = Number(parsed.version) || 0;
    favorites = parsed.favorites;
  } else if (Array.isArray(parsed)) {
    version = 0;
    favorites = parsed as FavoriteAlg[];
  } else {
    return EMPTY;
  }
  return migrateFavorites(favorites, version);
};

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
    cachedValue = raw ? migrate(JSON.parse(raw)) : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
};

// snapshot for non-reactive callers (event handlers that need the current list at call time)
export const readFavorites = (): FavoriteAlg[] => read();

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
  const raw = JSON.stringify({ version: STORE_VERSION, favorites } satisfies FavoritesEnvelope);
  window.localStorage.setItem(STORAGE_KEY, raw);
  // refresh the cache and notify same-tab subscribers (the storage event only fires cross-tab)
  cachedRaw = raw;
  cachedValue = favorites;
  listeners.forEach((l) => l());
};

const aufFreeAlg = (alg: string): string => splitLeadingAuf(alg).coreKey || alg.trim();

const toggle = (favorites: FavoriteAlg[], alg: string, sourceAlgset?: Algset): FavoriteAlg[] => {
  const core = aufFreeAlg(alg);
  const withoutVariants = favorites.filter((f) => aufFreeAlg(f.alg) !== core);
  return withoutVariants.length === favorites.length
    ? [...favorites, { alg: core, status: DEFAULT_STATUS, sourceAlgset }]
    : withoutVariants;
};

const setStatus = (favorites: FavoriteAlg[], alg: string, status: AlgStatus): FavoriteAlg[] =>
  favorites.map((f) => (f.alg === alg ? { ...f, status } : f));

// set (or clear, when blank) the manual algset override for an alg
const setAlgset = (favorites: FavoriteAlg[], alg: string, algset: string): FavoriteAlg[] =>
  favorites.map((f) => (f.alg === alg ? { ...f, algset: algset || undefined } : f));

// Rewrite an alg in place, keeping its status and algset.
// If rewrite matches an existing alg, that old existing is dropped.
const setAlgText = (favorites: FavoriteAlg[], alg: string, nextAlg: string): { favorites: FavoriteAlg[]; replaced: boolean } => {
  if (nextAlg === '' || nextAlg === alg) return { favorites, replaced: false };
  if (!favorites.some((f) => f.alg === alg)) return { favorites, replaced: false };
  const replaced = favorites.some((f) => f.alg === nextAlg);
  return {
    favorites: favorites
      .filter((f) => f.alg !== nextAlg)
      .map((f) => (f.alg === alg ? { ...f, alg: nextAlg } : f)),
    replaced,
  };
};

const remove = (favorites: FavoriteAlg[], alg: string): FavoriteAlg[] =>
  favorites.filter((f) => f.alg !== alg);

// merging never overwrites: an alg already saved keeps its status and algset
const merge = (favorites: FavoriteAlg[], incoming: FavoriteAlg[]): { favorites: FavoriteAlg[]; added: number } => {
  const known = new Set(favorites.map((f) => f.alg));
  const added = incoming.filter((f) => !known.has(f.alg));
  return { favorites: [...favorites, ...added], added: added.length };
};

/**
 * Reads favorites from local storage and keeps them in sync across tabs and components.
 * Returns the current list plus helpers to favorite, add, restatus, and delete an alg.
 */
export function useAlgFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const toggleFavorite = useCallback(
    (alg: string, sourceAlgset?: Algset) => write(toggle(read(), alg, sourceAlgset)),
    [],
  );
  // returns false when the alg is already saved, so callers can report the no-op
  const addFavorite = useCallback((alg: string, sourceAlgset?: Algset): boolean => {
    const current = read();
    if (current.some((f) => f.alg === alg)) return false;
    write([...current, { alg, status: DEFAULT_STATUS, sourceAlgset }]);
    return true;
  }, []);
  const setFavoriteStatus = useCallback((alg: string, status: AlgStatus) => write(setStatus(read(), alg, status)), []);
  const setFavoriteAlgset = useCallback((alg: string, algset: string) => write(setAlgset(read(), alg, algset)), []);
  // returns true when the rename dropped an already saved copy of nextAlg
  const setFavoriteAlg = useCallback((alg: string, nextAlg: string): boolean => {
    const { favorites: next, replaced } = setAlgText(read(), alg, nextAlg);
    write(next);
    return replaced;
  }, []);
  const removeFavorite = useCallback((alg: string) => write(remove(read(), alg)), []);
  // returns how many of the incoming algs were new, the rest being already saved
  const mergeFavorites = useCallback((incoming: FavoriteAlg[]): number => {
    const { favorites: next, added } = merge(read(), incoming);
    if (added > 0) write(next);
    return added;
  }, []);

  const isFavorite = useCallback(
    (alg: string) => favorites.some((f) => aufFreeAlg(f.alg) === aufFreeAlg(alg)),
    [favorites],
  );

  return { favorites, isFavorite, toggleFavorite, addFavorite, setFavoriteStatus, setFavoriteAlgset, setFavoriteAlg, removeFavorite, mergeFavorites };
}
