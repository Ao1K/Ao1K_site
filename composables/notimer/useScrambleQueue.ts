'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const fetchScrambles = async (puzzleType: string, count: number): Promise<string[]> => {
  const params = new URLSearchParams({ event: puzzleType, count: String(count) });
  const response = await fetch(`/api/scramble/?${params}`, { cache: 'no-store' });
  if (!response.ok) return [];
  const payload: unknown = await response.json();
  const scrambles = (payload as { scrambles?: unknown })?.scrambles;
  if (!Array.isArray(scrambles)) return [];
  return scrambles.filter((entry): entry is string => typeof entry === 'string');
};

export function useScrambleQueue(
  puzzleType: string,
  depth: number
): { next: string | null; consume: () => void } {
  const [queue, setQueue] = useState<string[]>([]);
  const hasBootstrapped = useRef(false);

  const request = useCallback(
    (count: number) => {
      fetchScrambles(puzzleType, count)
        .then((scrambles) => {
          if (scrambles.length === 0) return;
          setQueue((prev) => [...prev, ...scrambles]);
        })
        .catch(() => {});
    },
    [puzzleType]
  );

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    request(depth);
  }, [request, depth]);

  const consume = useCallback(() => {
    setQueue((prev) => prev.slice(1));
    request(1);
  }, [request]);

  return { next: queue[0] ?? null, consume };
}
