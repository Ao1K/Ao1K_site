import type { CubeSolverRequest, CubeSolverResponse } from './cubeSolver.worker';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

let worker: Worker | null = null;
let nextRequestId = 0;
const pending = new Map<number, (result: string | null) => void>();

const getWorker = (): Worker | null => {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (worker) return worker;

  worker = new Worker(new URL('./cubeSolver.worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (event: MessageEvent<CubeSolverResponse>) => {
    const resolve = pending.get(event.data.id);
    if (!resolve) return;
    pending.delete(event.data.id);
    resolve(event.data.result);
  };

  worker.onerror = () => {
    for (const resolve of pending.values()) resolve(null);
    pending.clear();
    worker?.terminate();
    worker = null;
  };

  return worker;
};

const request = (message: DistributiveOmit<CubeSolverRequest, 'id'>): Promise<string | null> => {
  const active = getWorker();
  if (!active) return Promise.resolve(null);

  const id = nextRequestId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    active.postMessage({ ...message, id } satisfies CubeSolverRequest);
  });
};

export const warmUpCubeSolver = () => {
  void request({ type: 'warmUp' });
};

export const solveKociemba = (scramble: string) => request({ type: 'solve', scramble });

let prefetchedScramble: Promise<string | null> | null = null;

export const prefetchRandomScramble = () => {
  prefetchedScramble ??= request({ type: 'scramble' });
};

export const takeRandomScramble = () => {
  const scramble = prefetchedScramble ?? request({ type: 'scramble' });
  prefetchedScramble = request({ type: 'scramble' });
  return scramble;
};
