import * as fs from 'fs';
import * as path from 'path';
import { SimpleCube } from '../composables/recon/SimpleCube';
import { SimpleCubeInterpreter } from '../composables/recon/SimpleCubeInterpreter';
import { reverseMove } from '../composables/recon/transformHTML';
import { splitLeadingAuf } from '../utils/collapseAufVariants';
import { canonicalizePair, aufTokenToVal, aufValToToken, combineAuf, rotateEOBits } from '../utils/canonicalizeAuf';

const SOLVED_HASH = 'abcdefghijklehkbnqtwabcdef';

const F2L_SLOT_PAIRS: { corner: number; edge: number }[] = [
  { corner: 16, edge: 8 },
  { corner: 17, edge: 9 },
  { corner: 18, edge: 11 },
  { corner: 19, edge: 10 },
];

function getAlgInverse(alg: string): string {
  const moves = alg.trim().split(/\s+/).filter(Boolean).reverse();
  return moves.map((m) => reverseMove(m)).join(' ').trim();
}

function hashFor(moves: string[]): string {
  const cube = new SimpleCube();
  const state = cube.getCubeState(moves.filter(Boolean));
  const interpreter = new SimpleCubeInterpreter();
  interpreter.getStepsCompleted(state);
  const hash = interpreter.getCurrentState()?.hash;
  if (!hash) throw new Error(`No hash for moves: ${moves.join(' ')}`);
  return hash;
}

function eoFor(moves: string[]): number {
  const cube = new SimpleCube();
  const state = cube.getCubeState(moves.filter(Boolean));
  const interpreter = new SimpleCubeInterpreter();
  interpreter.getStepsCompleted(state);
  return interpreter.getEOvalue();
}

function verifyRotateEOBits(): void {
  const MOVE_SET = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'B', "B'", 'B2', 'L', "L'", 'L2', 'R', "R'", 'R2'];
  let tested = 0;
  let mismatches = 0;

  for (const m1 of MOVE_SET) {
    for (const m2 of MOVE_SET) {
      const scramble = [m1, m2];
      const eo0 = eoFor(scramble);
      for (let q = 0; q < 4; q++) {
        const actual = eoFor([...scramble, aufValToToken(q)].filter(Boolean));
        tested++;
        if (rotateEOBits(eo0, q) !== actual) mismatches++;
      }
    }
  }

  console.log(`rotateEOBits: tested=${tested} mismatches=${mismatches}`);
}

verifyRotateEOBits();

const dataPath = path.join(process.cwd(), 'public', 'recon', 'compiled-exact-algs.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const f2lAlgs: { alg: string; hash: string }[] = data.algorithms.filter((a: any) => a.step === 'f2l');

const coreKeyCounts = new Map<string, number>();
f2lAlgs.forEach((a) => {
  const { coreKey } = splitLeadingAuf(a.alg);
  coreKeyCounts.set(coreKey, (coreKeyCounts.get(coreKey) ?? 0) + 1);
});

const withAuf = f2lAlgs.filter((a) => {
  const { coreKey, aufPart } = splitLeadingAuf(a.alg);
  // only test groups that fully collapsed to a single winner (clean, unambiguous case)
  return aufPart !== '' && coreKeyCounts.get(coreKey) === 1;
});

console.log(`Testing against ${withAuf.length} f2l algs with a leading AUF token (out of ${f2lAlgs.length}) whose coreKey group fully collapsed`);

let tested = 0;
let additionPasses = 0;
let subtractionPasses = 0;
let failures: string[] = [];

for (const entry of withAuf) {
  const { coreKey: base, aufPart: cWinning } = splitLeadingAuf(entry.alg);
  const baseInverse = getAlgInverse(base);
  const baseInverseMoves = baseInverse.split(' ').filter(Boolean);

  const unsolvedPairs = F2L_SLOT_PAIRS.filter(
    (pair) => !(entry.hash[pair.corner] === SOLVED_HASH[pair.corner] && entry.hash[pair.edge] === SOLVED_HASH[pair.edge])
  );
  // only test "clean" single-pair-disturbance algs so we know unambiguously which pair is the target
  if (unsolvedPairs.length !== 1) continue;

  for (const pair of unsolvedPairs) {
    for (let k = 0; k < 4; k++) {
      const liveMoves = [...baseInverseMoves, aufValToToken(k)].filter(Boolean);
      const liveHash = hashFor(liveMoves);

      const liveCornerChar = liveHash[pair.corner];
      const liveEdgeChar = liveHash[pair.edge];

      const { q: qLive } = canonicalizePair(liveCornerChar, liveEdgeChar);

      tested++;

      const mAdd = combineAuf(qLive, aufTokenToVal(cWinning));
      const mSub = (((aufTokenToVal(cWinning) - qLive) % 4) + 4) % 4;

      const checkReconstruction = (m: number): boolean => {
        const finalMoves = [aufValToToken(m), ...base.split(' ').filter(Boolean)].filter(Boolean);
        const resultHash = hashFor([...liveMoves, ...finalMoves]);
        return resultHash[pair.corner] === SOLVED_HASH[pair.corner] && resultHash[pair.edge] === SOLVED_HASH[pair.edge];
      };

      if (checkReconstruction(mAdd)) additionPasses++;
      if (checkReconstruction(mSub)) subtractionPasses++;
    }
  }
}

console.log(`tested=${tested} additionPasses=${additionPasses} subtractionPasses=${subtractionPasses}`);
console.log(`canonicalization mismatches: ${failures.length}`);
failures.slice(0, 10).forEach((f) => console.log('  ' + f));
