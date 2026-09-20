let worker: Worker | null = null;
let nextRequestId = 0;
const pending = new Map<number, (solution: string | null) => void>();

const getWorker = (): Worker | null => {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (worker) return worker;

  worker = new Worker(new URL('./cubeSolver.worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (event: MessageEvent<{ id: number; solution: string | null }>) => {
    const resolve = pending.get(event.data.id);
    if (!resolve) return;
    pending.delete(event.data.id);
    resolve(event.data.solution);
  };

  worker.onerror = () => {
    for (const resolve of pending.values()) resolve(null);
    pending.clear();
    worker?.terminate();
    worker = null;
  };

  return worker;
};

const request = (scramble: string | null): Promise<string | null> => {
  const active = getWorker();
  if (!active) return Promise.resolve(null);

  const id = nextRequestId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    active.postMessage({ id, scramble });
  });
};

export const warmUpCubeSolver = () => {
  void request(null);
};

export const solveKociemba = (scramble: string) => request(scramble);
