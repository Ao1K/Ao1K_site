import * as fs from 'fs';
import * as path from 'path';
import { SimpleCube } from '../composables/recon/SimpleCube';
import { SimpleCubeInterpreter } from '../composables/recon/SimpleCubeInterpreter';
import { reverseMove } from '../composables/recon/transformHTML';
import { splitLeadingAuf } from '../utils/collapseAufVariants';
import { canonicalizePair, aufTokenToVal, aufValToToken, rotateEOBits, eoAngleOfAlg } from '../utils/canonicalizeAuf';

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

const dataPath = path.join(process.cwd(), 'public', 'recon', 'compiled-f2l-algs.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const f2lAlgs: { alg: string; hash: string }[] = data.algorithms;

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

      const mAdd = (qLive + aufTokenToVal(cWinning)) % 4;
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

function verifyEOsolvedSignal(): void {
  const F2L_SETUP_TRIGGERS = [
    "R U R'", "R U' R'", "R U2 R'", "R' U R", "R' U' R", "L' U L", "L' U' L", "L U L'", "L U' L'",
    "F R U R' U' F'", 'U', "U'", 'U2', 'y', "y'", 'y2',
  ];
  const SAMPLE_COUNT = 400;
  const SETUP_LENGTH = 8;

  let seed = 20261007;
  const randomIndex = (n: number): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };

  const loadCompiled = (name: string) =>
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'recon', `compiled-${name}-algs.json`), 'utf-8')).algorithms;

  const interpreter = new SimpleCubeInterpreter();
  interpreter.addAlgset('f2l', loadCompiled('f2l'));
  interpreter.addAlgset('zbls', loadCompiled('zbls'));

  const exampleEightSetup = "R' B L2 U' B2 R' B2 D B R2 L2 U' L2 D2 R2 F2 D F2 D2 B2 D2 L2 R2 F D F' R' U L' U2 L U' L' U L";
  const setups = [
    exampleEightSetup,
    ...Array.from({ length: SAMPLE_COUNT }, () =>
      Array.from({ length: SETUP_LENGTH }, () => F2L_SETUP_TRIGGERS[randomIndex(F2L_SETUP_TRIGGERS.length)]).join(' ')),
  ];

  let checked = 0;
  const mismatches: string[] = [];
  const checkedByAngle = { y0: 0, y: 0 };

  for (const setup of setups) {
    const setupMoves = setup.split(' ');
    interpreter.getStepsCompleted(new SimpleCube().getCubeState(setupMoves));
    const pairsBefore = interpreter.getPairsSolved().length;
    const suggestions = interpreter.getAlgSuggestions();

    for (const suggestion of suggestions) {
      const afterMoves = [...setupMoves, ...suggestion.alg.split(' ')];
      interpreter.getStepsCompleted(new SimpleCube().getCubeState(afterMoves));
      if (interpreter.getPairsSolved().length <= pairsBefore) continue;

      const isEOsolvedAfter = interpreter.getEOvalue() === 0;
      checked++;
      checkedByAngle[eoAngleOfAlg(suggestion.alg)]++;
      if (Boolean(suggestion.hasEOsolved) !== isEOsolvedAfter) {
        mismatches.push(`${suggestion.alg} | hasEOsolved=${suggestion.hasEOsolved} actual=${isEOsolvedAfter} | setup: ${setup}`);
      }
    }
  }

  console.log(`hasEOsolved: checked=${checked} (y0=${checkedByAngle.y0}, y=${checkedByAngle.y}) mismatches=${mismatches.length}`);
  mismatches.slice(0, 10).forEach((m) => console.log('  ' + m));
}

verifyEOsolvedSignal();
