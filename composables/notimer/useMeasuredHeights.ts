'use client';

import { useCallback, useState } from 'react';

const lastKnownHeights = new Map<string, number>();

export function useMeasuredHeight(
  cacheKey: string,
): [number, (node: Element | null) => (() => void) | void] {
  const [height, setHeight] = useState(() => lastKnownHeights.get(cacheKey) ?? 0);

  const ref = useCallback(
    (node: Element | null) => {
      if (!node) return;

      const record = () => {
        const next = node.getBoundingClientRect().height;
        lastKnownHeights.set(cacheKey, next);
        setHeight(next);
      };

      record();
      const observer = new ResizeObserver(record);
      observer.observe(node);
      return () => observer.disconnect();
    },
    [cacheKey],
  );

  return [height, ref];
}
