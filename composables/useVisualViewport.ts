'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (callback: () => void): (() => void) => {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};

  viewport.addEventListener('resize', callback);
  viewport.addEventListener('scroll', callback);
  return () => {
    viewport.removeEventListener('resize', callback);
    viewport.removeEventListener('scroll', callback);
  };
};

const getSnapshot = (): number => window.visualViewport?.offsetTop ?? 0;
const getServerSnapshot = (): number => 0;

export function useVisualViewportOffsetTop(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
