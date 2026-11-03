import { solveKociemba } from './cubeSolverClient';
import { cube3x3, GEOMETRY_3X3 } from '../../utils/parser/cube3x3';
import type { Layer3x3, Move3x3, Rotation3x3 } from '../../utils/parser/cube3x3';
import type { Amount } from '../../utils/parser';

const undoRotations = (moves: readonly Move3x3[], rotations: readonly Rotation3x3[]): Move3x3[] =>
  cube3x3.invert(rotations).filter(cube3x3.isRotation).reduce(cube3x3.rotate, [...moves]);

const splitOutRotations = (alg: readonly Move3x3[]) => {
  const rotations: Rotation3x3[] = [];
  const moves: Move3x3[] = [];
  for (const move of alg) {
    if (cube3x3.isRotation(move)) {
      rotations.push(move);
    } else {
      moves.push(...undoRotations([move], rotations));
    }
  }
  return { moves, rotations };
};

export const removeRotations = (alg: readonly Move3x3[]) => splitOutRotations(alg).moves;

const FACE_AND_ROTATION_LAYERS: readonly Layer3x3[] = ['U', 'D', 'R', 'L', 'F', 'B', 'x', 'y', 'z'];

const expandSliceOrWideMove = (move: Move3x3): Move3x3[] => {
  const { axis, layers, sign } = cube3x3.geometry(move);
  const isSliceOrWide = layers.includes(0) && layers.length < 3;
  if (!isSliceOrWide) {
    return [move];
  }

  const signedTurns = sign * cube3x3.amount(move);
  return FACE_AND_ROTATION_LAYERS.flatMap((layer) => {
    const part = GEOMETRY_3X3[layer];
    const isWholeCube = part.layers.length === 3;
    const isTurnedByMove = !isWholeCube && layers.includes(part.layers[0]);
    if (part.axis !== axis || isTurnedByMove) {
      return [];
    }
    const partSignedTurns = isWholeCube ? signedTurns : -signedTurns;
    return [cube3x3.make(layer, (partSignedTurns * part.sign) as Amount)];
  });
};

const invertForCubeSolver = (moves: readonly Move3x3[]) => cube3x3.normalize(cube3x3.invert(moves));

const solveForFaceMovesAndRotations = async (setupMoves: readonly Move3x3[]) => {
  const { moves: faceMoves, rotations } = splitOutRotations(setupMoves.flatMap(expandSliceOrWideMove));
  const kociembaSolution = faceMoves.length > 0 ? await solveKociemba(cube3x3.format(invertForCubeSolver(faceMoves))) : '';
  if (kociembaSolution === null) {
    return null;
  }

  return { faceMoves: cube3x3.parse(kociembaSolution).moves, rotations: cube3x3.simplifyRotations(rotations) };
};

export const simplifySetupMoves = async (setupMoves: readonly Move3x3[]): Promise<Move3x3[]> => {
  if (setupMoves.length === 0) {
    return [];
  }

  const solved = await solveForFaceMovesAndRotations(setupMoves);
  if (!solved) {
    return [...setupMoves];
  }

  return [...solved.faceMoves, ...solved.rotations];
};

export const inferScrambleFromSolution = async (solution: readonly Move3x3[]): Promise<Move3x3[]> => {
  const setupMoves = invertForCubeSolver(removeRotations(solution));
  if (setupMoves.length === 0) {
    return [];
  }

  const solved = await solveForFaceMovesAndRotations(setupMoves);
  if (!solved) {
    return setupMoves;
  }

  return solved.rotations.reduce(cube3x3.rotate, solved.faceMoves);
};
