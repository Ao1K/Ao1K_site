import { SimpleCube } from './SimpleCube';
import type { Color, CubeState, Face, Line } from './SimpleCube';
import { parseMove } from '../../utils/moveUtils';

export type Facelets = Uint8Array;

export const FACELET_COUNT = 54;

const MOVE_BASES = ['U', 'D', 'F', 'B', 'L', 'R', 'u', 'd', 'f', 'b', 'l', 'r', 'M', 'E', 'S', 'x', 'y', 'z'] as const;
const SUFFIX_BY_AMOUNT = ['', '', '2', "'"] as const;
const FACE_COLORS: readonly Color[] = ['W', 'Y', 'G', 'R', 'B', 'O'];

const faceletIndex = (face: number, row: number, col: number) => face * 9 + row * 3 + col;

export const faceOfSticker = (sticker: number) => (sticker / 9) | 0;

function derivePermutation(move: string): Uint8Array {
  const cube = new SimpleCube();
  const labeled = cube.getCubeState([]);
  for (let face = 0; face < 6; face++) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        (labeled[face][row] as unknown as number[])[col] = faceletIndex(face, row, col);
      }
    }
  }

  const moved = cube.getCubeState([move]);
  const permutation = new Uint8Array(FACELET_COUNT);
  for (let face = 0; face < 6; face++) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        permutation[faceletIndex(face, row, col)] = moved[face][row][col] as unknown as number;
      }
    }
  }
  return permutation;
}

const permutationsByMove = new Map<string, Uint8Array>();
for (const base of MOVE_BASES) {
  for (const amount of [1, 2, 3]) {
    const move = `${base}${SUFFIX_BY_AMOUNT[amount]}`;
    permutationsByMove.set(move, derivePermutation(move));
  }
}

export function getMovePermutation(move: string): Uint8Array {
  const parsed = parseMove(move);
  const permutation = parsed && permutationsByMove.get(`${parsed.base}${SUFFIX_BY_AMOUNT[parsed.amount]}`);
  if (!permutation) throw new Error(`unsupported move: ${move}`);
  return permutation;
}

export function solvedFacelets(): Facelets {
  const facelets = new Uint8Array(FACELET_COUNT);
  for (let i = 0; i < FACELET_COUNT; i++) facelets[i] = i;
  return facelets;
}

export function applyPermutation(facelets: Facelets, permutation: Uint8Array, out: Facelets = new Uint8Array(FACELET_COUNT)): Facelets {
  for (let i = 0; i < FACELET_COUNT; i++) out[i] = facelets[permutation[i]];
  return out;
}

export function applyMoves(facelets: Facelets, moves: readonly string[]): Facelets {
  let current = facelets;
  for (const move of moves) {
    current = applyPermutation(current, getMovePermutation(move));
  }
  return current;
}

export function toSimpleCubeState(facelets: Facelets): CubeState {
  const faces = [0, 1, 2, 3, 4, 5].map(face =>
    [0, 1, 2].map(row =>
      [0, 1, 2].map(col => FACE_COLORS[faceOfSticker(facelets[faceletIndex(face, row, col)])]) as Line
    ) as Face
  );
  return faces as CubeState;
}
