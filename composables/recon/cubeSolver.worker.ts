import { initialize as initializeCubeSolver, solve as solveCube, scramble as randomScramble } from 'cube-solver';

export type CubeSolverRequest =
  | { id: number; type: 'warmUp' }
  | { id: number; type: 'solve'; scramble: string }
  | { id: number; type: 'scramble' };
export type CubeSolverResponse = { id: number; result: string | null };

const handleRequest = (request: CubeSolverRequest): string | null => {
  switch (request.type) {
    case 'warmUp':
      initializeCubeSolver('kociemba');
      return null;
    case 'solve':
      return solveCube(request.scramble, 'kociemba');
    case 'scramble':
      return randomScramble('3x3');
  }
};

self.onmessage = (event: MessageEvent<CubeSolverRequest>) => {
  const { id } = event.data;

  try {
    self.postMessage({ id, result: handleRequest(event.data) } satisfies CubeSolverResponse);
  } catch {
    self.postMessage({ id, result: null } satisfies CubeSolverResponse);
  }
};
