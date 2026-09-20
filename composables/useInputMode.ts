'use client';

import { useSyncExternalStore } from 'react';

export type InputMode = 'keyboard' | 'touch';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

let mediaQuery: MediaQueryList | null = null;

const query = (): MediaQueryList | null => {
  if (typeof window === 'undefined') return null;
  if (!mediaQuery) mediaQuery = window.matchMedia(COARSE_POINTER_QUERY);
  return mediaQuery;
};

const subscribe = (callback: () => void): (() => void) => {
  const list = query();
  if (!list) return () => {};
  list.addEventListener('change', callback);
  return () => list.removeEventListener('change', callback);
};

const read = (): InputMode => (query()?.matches ? 'touch' : 'keyboard');

const getServerSnapshot = (): InputMode => 'keyboard';

export function useInputMode(): InputMode {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}
