/**
 * Generate wrapped-trigger 5-mover algorithms as AlgCompiler input records
 * (ExactAlg shape). The AlgCompiler does the rest (compiling, and expanding the
 * optional leading U via add_U into the 6-move variants).
 *
 * A trigger is `X U* X'` where X is a single R/L/F/B move (no doubles) and the
 * middle U move is U, U' or U2. The trigger is then wrapped in two reversed
 * moves of an adjacent face (also no doubles), e.g. F' R U R' F.
 */

import * as fs from 'fs';
import * as path from 'path';

interface FiveMoverAlg {
  new: boolean;
  value: string;
  step: string;
  add_y: boolean;
  add_U: boolean;
}

const triggerFaces = ['R', 'L', 'F', 'B'] as const;
const uMoves = ['U', "U'", 'U2'] as const;

const adjacentFaces: Record<(typeof triggerFaces)[number], string[]> = {
  R: ['F', 'B'],
  L: ['F', 'B'],
  F: ['R', 'L'],
  B: ['R', 'L'],
};

function invert(move: string): string {
  return move.endsWith("'") ? move.slice(0, -1) : move + "'";
}

function generateAlgs(): FiveMoverAlg[] {
  const algs: FiveMoverAlg[] = [];

  for (const face of triggerFaces) {
    for (const dir of ['', "'"]) {
      const open = face + dir;
      const close = invert(open);

      for (const uMove of uMoves) {
        for (const wrapFace of adjacentFaces[face]) {
          for (const wrapDir of ['', "'"]) {
            const wrapOpen = wrapFace + wrapDir;
            const wrapClose = invert(wrapOpen);
            const value = [wrapOpen, open, uMove, close, wrapClose].join(' ');
            algs.push({
              new: true,
              value,
              step: 'f2l',
              add_y: false,
              add_U: true,
            });
          }
        }
      }
    }
  }

  return algs;
}

function main() {
  const algs = generateAlgs();

  const outputPath = path.join(__dirname, '..', 'five-movers.json');
  fs.writeFileSync(outputPath, JSON.stringify(algs, null, 2), 'utf-8');

  console.error(`Wrote ${algs.length} 5-mover algs to ${outputPath}`);
}

main();
