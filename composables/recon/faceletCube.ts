import { SimpleCube } from './SimpleCube';
import type { Color, CubeState, Face, Line } from './SimpleCube';
import { cube3x3, MOVES_3X3 } from '../../utils/parser/cube3x3';
import type { Move3x3 } from '../../utils/parser/cube3x3';

export type Facelets = Uint8Array;

export const FACELET_COUNT = 54;

const FACE_COLORS: readonly Color[] = ['W', 'Y', 'G', 'R', 'B', 'O'];

const faceletIndex = (face: number, row: number, col: number) => face * 9 + row * 3 + col;

export const faceOfSticker = (sticker: number) => (sticker / 9) | 0;

function deriveStickerMap(move: Move3x3): Uint8Array {
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
  const stickerMap = new Uint8Array(FACELET_COUNT);
  for (let face = 0; face < 6; face++) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        stickerMap[faceletIndex(face, row, col)] = moved[face][row][col] as unknown as number;
      }
    }
  }
  return stickerMap;
}

const stickerMapsByMove = new Map<Move3x3, Uint8Array>();
for (const move of MOVES_3X3) {
  const [canonicalMove] = cube3x3.normalize([move]);
  const stickerMap = stickerMapsByMove.get(canonicalMove) ?? deriveStickerMap(canonicalMove);
  stickerMapsByMove.set(canonicalMove, stickerMap);
  stickerMapsByMove.set(move, stickerMap);
}

export function getMoveStickerMap(move: Move3x3): Uint8Array {
  const stickerMap = stickerMapsByMove.get(move);
  if (!stickerMap) throw new Error(`unsupported move: ${move}`);
  return stickerMap;
}

export function solvedFacelets(): Facelets {
  const facelets = new Uint8Array(FACELET_COUNT);
  for (let i = 0; i < FACELET_COUNT; i++) facelets[i] = i;
  return facelets;
}

export function applyStickerMap(facelets: Facelets, stickerMap: Uint8Array, out: Facelets = new Uint8Array(FACELET_COUNT)): Facelets {
  for (let i = 0; i < FACELET_COUNT; i++) out[i] = facelets[stickerMap[i]];
  return out;
}

export function applyMoves(facelets: Facelets, moves: readonly Move3x3[]): Facelets {
  let current = facelets;
  for (const move of moves) {
    current = applyStickerMap(current, getMoveStickerMap(move));
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
