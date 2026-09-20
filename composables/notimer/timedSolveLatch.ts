'use client';

import { useSyncExternalStore } from 'react';

import { hasTimedSolve } from './dbUtils';

const STORAGE_KEY = 'ao1k.notimerTimedSolve';

let latched = false;
let probed = false;
const listeners = new Set<() => void>();

function readStorage(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStorage(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    return;
  }
}

export function markTimedSolve(): void {
  if (latched) return;
  latched = true;
  writeStorage();
  for (const listener of listeners) listener();
}

function probeOnce(): void {
  if (probed || latched) return;
  probed = true;
  if (readStorage()) {
    markTimedSolve();
    return;
  }
  hasTimedSolve().then((exists) => {
    if (exists) markTimedSolve();
  });
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  probeOnce();
  return () => {
    listeners.delete(listener);
  };
};

const read = (): boolean => latched;

const getServerSnapshot = (): boolean => false;

export function useTimedSolveLatch(): boolean {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}
