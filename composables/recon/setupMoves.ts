import { solveKociemba } from './cubeSolverClient';
import { reverseMove, replacementTable_X, replacementTable_Y, replacementTable_Z } from './transformHTML';

const rotationTables: Record<string, Record<string, string>> = {
  x: replacementTable_X,
  y: replacementTable_Y,
  z: replacementTable_Z,
};

const quarterTurnsBySuffix: Record<string, number> = { '': 1, "'": 3, '2': 2, "2'": 2, '3': 3, "3'": 1 };

const undoRotation = (move: string, rotation: string) => {
  const table = rotationTables[rotation[0]];
  const undoQuarterTurns = (4 - (quarterTurnsBySuffix[rotation.slice(1)] ?? 0)) % 4;
  let undoneMove = move;
  for (let i = 0; i < undoQuarterTurns; i++) {
    undoneMove = table[undoneMove] ?? undoneMove;
  }
  return undoneMove;
};

export const removeRotations = (alg: string) => {
  const rotations: string[] = [];
  const moves: string[] = [];
  for (const move of alg.split(' ')) {
    if (move[0] in rotationTables) {
      rotations.push(move);
    } else {
      moves.push(rotations.reduceRight(undoRotation, move));
    }
  }
  return moves.join(' ');
};

const normalizeMoveForCubeSolver = (move: string) => {
  if (!move) {
    return '';
  }

  const rootMove = move[0];
  const suffix = move.slice(1);

  switch (suffix) {
    case "2'":
      return `${rootMove}2`;
    case '3':
      return `${rootMove}'`;
    case "3'":
      return rootMove;
    default:
      return move;
  }
};

export const invertAlgMoves = (alg: string) => alg.split(' ')
  .reverse()
  .map(reverseMove)
  .map(normalizeMoveForCubeSolver)
  .join(' ');

export const simplifySetupMoves = async (setupMoves: string) => {
  if (!setupMoves) {
    return '';
  }

  if (setupMoves.split(' ').length < 10) {
    return setupMoves;
  }

  const kociembaSolution = await solveKociemba(invertAlgMoves(setupMoves));
  if (kociembaSolution && kociembaSolution.split(' ').length < setupMoves.split(' ').length) {
    return kociembaSolution;
  }
  return setupMoves;
};
