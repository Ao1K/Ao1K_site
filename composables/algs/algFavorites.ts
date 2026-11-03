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
import { aufFreeAlg, aufFreeKey } from './algMoves';
import { cube3x3, type Move3x3 } from '../../utils/parser/cube3x3';

export type AlgStatus = 'learning' | 'learned' | 'none';

export interface StoredFavorite {
  alg: string;
  status: AlgStatus;
  // manual algset description override (max 6 chars). Absent = use the detected algset.
  algset?: string;

  // the algset the alg was suggested from; the case name is derived from it, never stored
  // TODO: Remove? Editing a faved alg in place can make it a member of a totally different algset, which makes sourceAlgset pretty useless
  // sourceAlgset is and could continue to be used as a hint
  sourceAlgset?: Algset;
}

export interface FavoriteAlg extends Omit<StoredFavorite, 'alg'> {
  moves: Move3x3[];
}

interface FavoritesEnvelope {
  version: number;
  favorites: StoredFavorite[];
}

const STORAGE_KEY = 'ao1k.algFavorites';
const DEFAULT_STATUS: AlgStatus = 'learning';
export const STORE_VERSION = 1;

// stable empty reference for the server snapshot and parse failures
const EMPTY: FavoriteAlg[] = [];

// forward migrations keyed by the version they upgrade from. To change the stored shape, bump
// STORE_VERSION and add the step that turns version N favorites into version N+1 favorites.
const MIGRATIONS: Record<number, (favorites: StoredFavorite[]) => StoredFavorite[]> = {};

// runs the migration steps from fromVersion up to STORE_VERSION. The CSV import reads a version
// out of the file and calls this too, so both it and local storage share one set of steps.
export const migrateFavorites = (favorites: StoredFavorite[], fromVersion: number): FavoriteAlg[] => {
  let version = fromVersion;
  let migrated = favorites;
  while (version < STORE_VERSION) {
    const step = MIGRATIONS[version];
    if (step) migrated = step(migrated);
    version += 1;
  }
  return migrated.map(({ alg, ...rest }) => ({ ...rest, moves: cube3x3.parse(alg).moves }));
};

const isEnvelope = (value: unknown): value is FavoritesEnvelope =>
  !!value && typeof value === 'object' && !Array.isArray(value) &&
  Array.isArray((value as FavoritesEnvelope).favorites);

// bring any stored shape up to STORE_VERSION. A bare array is the pre-versioning format, read as
// version 0; a valid envelope carries its own version; anything else is discarded as empty.
const migrate = (parsed: unknown): FavoriteAlg[] => {
  let version: number;
  let favorites: StoredFavorite[];
  if (isEnvelope(parsed)) {
    version = Number(parsed.version) || 0;
    favorites = parsed.favorites;
  } else if (Array.isArray(parsed)) {
    version = 0;
    favorites = parsed as StoredFavorite[];
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
  const stored = favorites.map(({ moves, ...rest }) => ({ alg: cube3x3.format(moves), ...rest }));
  const raw = JSON.stringify({ version: STORE_VERSION, favorites: stored } satisfies FavoritesEnvelope);
  window.localStorage.setItem(STORAGE_KEY, raw);
  // refresh the cache and notify same-tab subscribers (the storage event only fires cross-tab)
  cachedRaw = raw;
  cachedValue = favorites;
  listeners.forEach((l) => l());
};

const toggle = (favorites: FavoriteAlg[], moves: Move3x3[], sourceAlgset?: Algset): FavoriteAlg[] => {
  const core = aufFreeAlg(moves);
  const coreKey = aufFreeKey(moves);
  const withoutVariants = favorites.filter((f) => aufFreeKey(f.moves) !== coreKey);
  return withoutVariants.length === favorites.length
    ? [...favorites, { moves: core, status: DEFAULT_STATUS, sourceAlgset }]
    : withoutVariants;
};

const setStatus = (favorites: FavoriteAlg[], moves: Move3x3[], status: AlgStatus): FavoriteAlg[] => {
  const key = cube3x3.format(moves);
  return favorites.map((f) => (cube3x3.format(f.moves) === key ? { ...f, status } : f));
};

// set (or clear, when blank) the manual algset override for an alg
const setAlgset = (favorites: FavoriteAlg[], moves: Move3x3[], algset: string): FavoriteAlg[] => {
  const key = cube3x3.format(moves);
  return favorites.map((f) => (cube3x3.format(f.moves) === key ? { ...f, algset: algset || undefined } : f));
};

// Rewrite an alg in place, keeping its status and algset.
// If rewrite matches an existing alg, that old existing is dropped.
const setAlgMoves = (favorites: FavoriteAlg[], moves: Move3x3[], nextMoves: Move3x3[]): { favorites: FavoriteAlg[]; replaced: boolean } => {
  const key = cube3x3.format(moves);
  const nextKey = cube3x3.format(nextMoves);
  if (nextKey === '' || nextKey === key) return { favorites, replaced: false };
  if (!favorites.some((f) => cube3x3.format(f.moves) === key)) return { favorites, replaced: false };
  const replaced = favorites.some((f) => cube3x3.format(f.moves) === nextKey);
  return {
    favorites: favorites
      .filter((f) => cube3x3.format(f.moves) !== nextKey)
      .map((f) => (cube3x3.format(f.moves) === key ? { ...f, moves: nextMoves } : f)),
    replaced,
  };
};

const remove = (favorites: FavoriteAlg[], moves: Move3x3[]): FavoriteAlg[] => {
  const key = cube3x3.format(moves);
  return favorites.filter((f) => cube3x3.format(f.moves) !== key);
};

// merging never overwrites: an alg already saved keeps its status and algset
const merge = (favorites: FavoriteAlg[], incoming: FavoriteAlg[]): { favorites: FavoriteAlg[]; added: number } => {
  const known = new Set(favorites.map((f) => cube3x3.format(f.moves)));
  const added = incoming.filter((f) => !known.has(cube3x3.format(f.moves)));
  return { favorites: [...favorites, ...added], added: added.length };
};

/**
 * Reads favorites from local storage and keeps them in sync across tabs and components.
 * Returns the current list plus helpers to favorite, add, restatus, and delete an alg.
 */
export function useAlgFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, getServerSnapshot);

  const toggleFavorite = useCallback(
    (moves: Move3x3[], sourceAlgset?: Algset) => write(toggle(read(), moves, sourceAlgset)),
    [],
  );
  // returns false when the alg is already saved, so callers can report the no-op
  const addFavorite = useCallback((moves: Move3x3[], sourceAlgset?: Algset): boolean => {
    const current = read();
    const key = cube3x3.format(moves);
    if (current.some((f) => cube3x3.format(f.moves) === key)) return false;
    write([...current, { moves, status: DEFAULT_STATUS, sourceAlgset }]);
    return true;
  }, []);
  const setFavoriteStatus = useCallback((moves: Move3x3[], status: AlgStatus) => write(setStatus(read(), moves, status)), []);
  const setFavoriteAlgset = useCallback((moves: Move3x3[], algset: string) => write(setAlgset(read(), moves, algset)), []);
  // returns true when the rename dropped an already saved copy of nextMoves
  const setFavoriteAlg = useCallback((moves: Move3x3[], nextMoves: Move3x3[]): boolean => {
    const { favorites: next, replaced } = setAlgMoves(read(), moves, nextMoves);
    write(next);
    return replaced;
  }, []);
  const removeFavorite = useCallback((moves: Move3x3[]) => write(remove(read(), moves)), []);
  // returns how many of the incoming algs were new, the rest being already saved
  const mergeFavorites = useCallback((incoming: FavoriteAlg[]): number => {
    const { favorites: next, added } = merge(read(), incoming);
    if (added > 0) write(next);
    return added;
  }, []);

  const isFavorite = useCallback(
    (moves: Move3x3[]) => {
      const coreKey = aufFreeKey(moves);
      return favorites.some((f) => aufFreeKey(f.moves) === coreKey);
    },
    [favorites],
  );

  return { favorites, isFavorite, toggleFavorite, addFavorite, setFavoriteStatus, setFavoriteAlgset, setFavoriteAlg, removeFavorite, mergeFavorites };
}
