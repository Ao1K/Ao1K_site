'use client';

import { useSyncExternalStore } from 'react';

let headerHidden = false;
const listeners = new Set<() => void>();

export function setHeaderHidden(hidden: boolean): void {
  if (headerHidden === hidden) return;
  headerHidden = hidden;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const readHidden = (): boolean => headerHidden;
const readServerHidden = (): boolean => false;

export function useHeaderHidden(): boolean {
  return useSyncExternalStore(subscribe, readHidden, readServerHidden);
}
