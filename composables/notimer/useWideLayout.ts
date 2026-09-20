'use client';

import { useSyncExternalStore } from 'react';

const TWO_SIDEBAR_QUERY = '(min-width: 80rem)';

let mediaQuery: MediaQueryList | null = null;

const query = (): MediaQueryList | null => {
  if (typeof window === 'undefined') return null;
  if (!mediaQuery) mediaQuery = window.matchMedia(TWO_SIDEBAR_QUERY);
  return mediaQuery;
};

const subscribe = (callback: () => void): (() => void) => {
  const list = query();
  if (!list) return () => {};
  list.addEventListener('change', callback);
  return () => list.removeEventListener('change', callback);
};

const read = (): boolean => query()?.matches ?? false;

const getServerSnapshot = (): boolean => false;

export function useWideLayout(): boolean {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}
