import { initialize as initializeCubeSolver, solve as solveCube } from 'cube-solver';

type SolveRequest = { id: number; scramble: string | null };
type SolveResponse = { id: number; solution: string | null };

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  const { id, scramble } = event.data;

  if (scramble === null) {
    initializeCubeSolver('kociemba');
    self.postMessage({ id, solution: null } satisfies SolveResponse);
    return;
  }

  try {
    self.postMessage({ id, solution: solveCube(scramble, 'kociemba') } satisfies SolveResponse);
  } catch {
    self.postMessage({ id, solution: null } satisfies SolveResponse);
  }
};
