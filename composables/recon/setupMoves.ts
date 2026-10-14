import { solveKociemba } from './cubeSolverClient';
import { reverseMove, replacementTable_X, replacementTable_Y, replacementTable_Z } from './transformHTML';

const rotationTables: Record<string, Record<string, string>> = {
  x: replacementTable_X,
  y: replacementTable_Y,
  z: replacementTable_Z,
};

const quarterTurnsBySuffix: Record<string, number> = { '': 1, "'": 3, '2': 2, "2'": 2, '3': 3, "3'": 1 };

const turnMoveThroughRotationTable = (move: string, rotation: string, quarterTurns: number) => {
  const table = rotationTables[rotation[0]];
  let turnedMove = move;
  for (let i = 0; i < quarterTurns % 4; i++) {
    turnedMove = table[turnedMove] ?? turnedMove;
  }
  return turnedMove;
};

const undoRotation = (move: string, rotation: string) =>
  turnMoveThroughRotationTable(move, rotation, 4 - (quarterTurnsBySuffix[rotation.slice(1)] ?? 4));

const applyRotation = (move: string, rotation: string) =>
  turnMoveThroughRotationTable(move, rotation, quarterTurnsBySuffix[rotation.slice(1)]);

const splitOutRotations = (alg: string) => {
  const rotations: string[] = [];
  const moves: string[] = [];
  for (const move of alg.split(' ')) {
    if (move[0] in rotationTables) {
      rotations.push(move);
    } else {
      moves.push(rotations.reduceRight(undoRotation, move));
    }
  }
  return { moves, rotations };
};

export const removeRotations = (alg: string) => splitOutRotations(alg).moves.join(' ');

const suffixByQuarterTurns: Record<number, string> = { 1: '', 2: '2', 3: "'" };

const singleRotations = ['x', 'y', 'z'].flatMap((axis) => ['', "'", '2'].map((suffix) => axis + suffix));

const rotationCandidatesShortestFirst = [
  [],
  ...singleRotations.map((rotation) => [rotation]),
  ...singleRotations.flatMap((first) => singleRotations
    .filter((second) => second[0] !== first[0])
    .map((second) => [first, second])),
];

const getOrientationKey = (rotations: string[]) => ['U', 'F'].map((face) => rotations.reduceRight(undoRotation, face)).join(' ');

const shortenRotations = (rotations: string[]) => {
  const orientationKey = getOrientationKey(rotations);
  return rotationCandidatesShortestFirst.find((candidate) => getOrientationKey(candidate) === orientationKey)!;
};

const faceMovesAndRotationBySliceOrWideMove: Record<string, string[]> = {
  M: ['R', "L'", "x'"],
  E: ['U', "D'", "y'"],
  S: ["F'", 'B', 'z'],
  r: ['L', 'x'],
  l: ['R', "x'"],
  u: ['D', 'y'],
  d: ['U', "y'"],
  f: ['B', 'z'],
  b: ['F', "z'"],
};

const expandSliceOrWideMove = (move: string) => {
  const expansion = faceMovesAndRotationBySliceOrWideMove[move[0]];
  if (!expansion) {
    return [move];
  }

  const quarterTurns = quarterTurnsBySuffix[move.slice(1)];
  return expansion.map((part) => {
    const partQuarterTurns = (quarterTurnsBySuffix[part.slice(1)] * quarterTurns) % 4;
    return part[0] + suffixByQuarterTurns[partQuarterTurns];
  });
};

const normalizeMoveForCubeSolver = (move: string) => {
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

const invertAlgMoves =(alg: string) => alg.split(' ')
  .reverse()
  .map(reverseMove)
  .map(normalizeMoveForCubeSolver)
  .join(' ');

const solveForFaceMovesAndRotations = async (setupMoves: string) => {
  const { moves: faceMoves, rotations } = splitOutRotations(setupMoves.split(' ').flatMap(expandSliceOrWideMove).join(' '));
  const kociembaSolution = faceMoves.length > 0 ? await solveKociemba(invertAlgMoves(faceMoves.join(' '))) : '';
  if (kociembaSolution === null) {
    return null;
  }

  return { faceMoves: kociembaSolution.split(' ').filter(Boolean), rotations: shortenRotations(rotations) };
};

export const simplifySetupMoves = async (setupMoves: string) => {
  if (!setupMoves) {
    return '';
  }

  const solved = await solveForFaceMovesAndRotations(setupMoves);
  if (!solved) {
    return setupMoves;
  }

  return [...solved.faceMoves, ...solved.rotations].join(' ');
};

export const inferScrambleFromSolution = async (solution: string) => {
  const setupMoves = invertAlgMoves(removeRotations(solution));
  if (!setupMoves) {
    return '';
  }

  const solved = await solveForFaceMovesAndRotations(setupMoves);
  if (!solved) {
    return setupMoves;
  }

  return solved.faceMoves.map((move) => solved.rotations.reduce(applyRotation, move)).join(' ');
};
