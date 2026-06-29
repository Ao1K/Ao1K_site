// Labels the moves of an F2L solution so the card can show a step-by-step breakdown.
//
// The structure of a typical F2L solution, read from the end:
//   - "insert": an optional aligning U, then the final trigger "<RLFB> <U> <RLFB reversed>" (e.g. U B' U B).
//   - "set up pair": just before the insert, an optional U and a trigger.
//   - "rotate based on EO": a leading y/y' rotation, but only when every following move is
//     an R/U/L/D move (the rotation that lets the pair be solved without F/B turns).
//
// Labelers are kept small and independent so more can be added later.

import { tokenize } from './algMoves';

export interface F2lSegment {
  // a labeled portion of the alg; segments without a label are still shown, unlabeled
  label?: string;
  moves: string[];
}

const baseOf = (token: string): string => token[0] ?? '';

const amountOf = (token: string): number => {
  const suffix = token.slice(1);
  if (suffix === '') return 1;
  if (suffix === "'") return 3;
  return 2;
};

const RLFB = new Set(['R', 'L', 'F', 'B', 'r', 'l', 'f', 'b']);
const RULD = new Set(['R', 'U', 'L', 'D', 'r', 'u', 'l', 'd']);
const ROTATIONS = new Set(['x', 'y', 'z']);

const isU = (token: string): boolean => baseOf(token) === 'U';
const isRotation = (token: string): boolean => ROTATIONS.has(baseOf(token));
const isRULD = (token: string): boolean => RULD.has(baseOf(token));

// two turns of the same face that cancel (e.g. R & R', or R2 & R2)
const areInverse = (a: string, b: string): boolean =>
  baseOf(a) === baseOf(b) && (amountOf(a) + amountOf(b)) % 4 === 0;

// a trigger is "<RLFB> <U> <same RLFB reversed>", e.g. R U R' or B' U B or R U2 R'
const isTrigger = (moves: string[]): boolean =>
  moves.length === 3 &&
  RLFB.has(baseOf(moves[0])) &&
  isU(moves[1]) &&
  RLFB.has(baseOf(moves[2])) &&
  areInverse(moves[0], moves[2]);

/**
 * Breaks an F2L solution into labeled segments in display (forward) order.
 * Returns null when nothing could be labeled, so the card can skip the dropdown.
 */
export function labelF2lAlg(alg: string): F2lSegment[] | null {
  const moves = tokenize(alg);
  if (moves.length === 0) return null;
  const hi = moves.length;

  // leading rotation, only meaningful as EO when the rest is R/U/L/D
  let lo = 0;
  const rotatedEO = moves.length > 1 && isRotation(moves[0]) && moves.slice(1).every(isRULD);
  if (rotatedEO) lo = 1;

  // insert: the last three moves, if they form a trigger
  let insertStart = -1;
  if (hi - lo >= 3 && isTrigger(moves.slice(hi - 3, hi))) insertStart = hi - 3;

  // an optional U right before the trigger aligns the layer for the insert, so it
  // belongs to the insert rather than the preceding setup
  if (insertStart - 1 >= lo && isU(moves[insertStart - 1])) insertStart -= 1;

  // set up pair: [optional U] trigger ending right before the insert
  let setupStart = -1;
  if (insertStart > lo) {
    const trigStart = insertStart - 3;
    if (trigStart >= lo && isTrigger(moves.slice(trigStart, insertStart))) {
      const leadingU = trigStart - 1 >= lo && isU(moves[trigStart - 1]) ? 1 : 0;
      setupStart = trigStart - leadingU;
    }
  }

  if (!rotatedEO && insertStart < 0) return null;

  const segments: F2lSegment[] = [];
  if (rotatedEO) segments.push({ label: 'Rotate based on EO', moves: [moves[0]] });

  const midEnd = setupStart >= 0 ? setupStart : insertStart >= 0 ? insertStart : hi;
  if (midEnd > lo) segments.push({ moves: moves.slice(lo, midEnd) });
  if (setupStart >= 0) segments.push({ label: 'Set up pair', moves: moves.slice(setupStart, insertStart) });
  if (insertStart >= 0) segments.push({ label: 'Insert', moves: moves.slice(insertStart, hi) });

  return segments;
}
