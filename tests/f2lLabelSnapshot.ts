import * as fs from 'fs';
import * as path from 'path';
import { SimpleCubeInterpreter } from '../composables/recon/SimpleCubeInterpreter';
import type { Doc } from '../composables/recon/ExactAlgSuggester';
import type { Color } from '../composables/recon/SimpleCube';
import { MAX_SHOWN_SUGGESTIONS } from '../composables/recon/suggestionRanking';
import { buildF2lCubeState } from '../composables/algs/f2lCubeState';
import { labelF2lAlg, type F2lBreakdownRow } from '../composables/algs/f2lLabeling';
import { CROSS_OPTIONS, FACE_COLOR_NAME, f2lPairHomeSlot, pairsForCross, type FaceKey } from '../composables/algs/cubePaint';
import {
  configToRaw,
  decodePrefixToState,
  encodePrefixFromState,
  freeEoEdgesInViewOrder,
  isFullEOActive,
  isFullEOValid,
  isPairSolved,
  isSlotFillable,
  rawToConfig,
  type F2lCaseConfig,
} from '../composables/algs/f2lCaseId';

interface AlgSnapshot {
  alg: string;
  rows: F2lBreakdownRow[] | null;
}

interface CaseSnapshot {
  prefix: string;
  raw: string;
  algs: AlgSnapshot[];
}

const SNAPSHOT_PATH = path.join(__dirname, 'snapshots/f2lLabels.json');
const CASE_COUNT = 100;
const SEED = 1;

const args = process.argv.slice(2);
const record = args.includes('--record');
const tolerance = Number(args.find((arg) => arg.startsWith('--tolerance='))?.split('=')[1] ?? 0.02);
const shownDiffs = Number(args.find((arg) => arg.startsWith('--show='))?.split('=')[1] ?? 10);

const COLOR_OF: Record<FaceKey, Color> = { up: 'W', down: 'Y', front: 'G', right: 'R', back: 'B', left: 'O' };
const SLOT_ORDER = ['FR', 'BR', 'BL', 'FL'] as const;
const CORNER_LOCS = ['UFR', 'UBR', 'UBL', 'UFL', 'DFR', 'DBR', 'DBL', 'DFL'] as const;
const EDGE_LOCS = ['UF', 'UR', 'UB', 'UL', 'FR', 'BR', 'BL', 'FL'] as const;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildInterpreter(): SimpleCubeInterpreter {
  const loadAlgs = (fileName: string) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, '../public/recon', fileName), 'utf8')).algorithms as Doc[];
  const interpreter = new SimpleCubeInterpreter();
  interpreter.addAlgset('f2l', loadAlgs('compiled-f2l-algs.json'));
  interpreter.addAlgset('zbls', loadAlgs('compiled-zbls-algs.json'));
  return interpreter;
}

function suggestAlgs(
  interpreter: SimpleCubeInterpreter,
  config: F2lCaseConfig,
  cross: FaceKey,
  pair: [FaceKey, FaceKey],
): string[] {
  if (!isFullEOValid(config) || isPairSolved(config, cross, pair)) return [];
  const steps = interpreter.getStepsCompleted(buildF2lCubeState(config, cross, pair));
  const f2lPair = pair.map((face) => FACE_COLOR_NAME[face]) as [string, string];
  const suggestions = interpreter.getAlgSuggestions(steps, { f2lPair, enabledAlgsets: new Set(['f2l', 'zbls']) });

  const wantColors = pair.map((face) => COLOR_OF[face]);
  const isTargetPair = (step: string) => {
    const match = /^([WYGBRO])([WYGBRO]) pair$/.exec(step);
    return match != null && wantColors.includes(match[1] as Color) && wantColors.includes(match[2] as Color);
  };
  const shown = suggestions.filter((s) => s.steps.some(isTargetPair)).slice(0, MAX_SHOWN_SUGGESTIONS);
  const eoFiltered = isFullEOActive(config) ? shown.filter((s) => s.hasEOsolved) : shown;
  return eoFiltered.map((s) => s.alg);
}

function randomRaw(random: () => number, cross: FaceKey, pair: [FaceKey, FaceKey]): string {
  const pick = (n: number) => Math.floor(random() * n);
  const y = pick(4);
  const corner = pick(8);
  const edge = pick(8);
  let raw = `y${y}${corner}${pick(3)}${edge}${pick(2)}`;

  const home = f2lPairHomeSlot(cross, pair, y);
  for (const slot of SLOT_ORDER) {
    const fillable = isSlotFillable(slot, CORNER_LOCS[corner], EDGE_LOCS[edge], home);
    raw += fillable && random() < 0.3 ? '1' : '0';
  }

  if (random() < 0.2) {
    const config = rawToConfig(raw, cross, pair);
    if (!config) return raw;
    const bits = freeEoEdgesInViewOrder(config).map(() => (random() < 0.3 ? 1 : 0));
    const flippedCount = bits.filter(Boolean).length + (config.edge?.orientation ?? 0);
    if (flippedCount % 2 === 1 && bits.length) bits[0] ^= 1;
    raw += bits.join('');
  }
  return raw;
}

interface CaseInput {
  prefix: string;
  raw: string;
  cross: FaceKey;
  pair: [FaceKey, FaceKey];
  config: F2lCaseConfig;
}

function decodeCase(prefix: string, raw: string): CaseInput {
  const decoded = decodePrefixToState(prefix);
  const config = decoded && rawToConfig(raw, decoded.cross, decoded.pair);
  if (!decoded || !config || configToRaw(config) !== raw) throw new Error(`bad case id ${prefix} ${raw}`);
  return { prefix, raw, ...decoded, config };
}

function pickCases(interpreter: SimpleCubeInterpreter): CaseInput[] {
  const random = mulberry32(SEED);
  const cases: CaseInput[] = [];
  const seen = new Set<string>();

  while (cases.length < CASE_COUNT) {
    const cross = CROSS_OPTIONS[Math.floor(random() * CROSS_OPTIONS.length)];
    const pairs = pairsForCross(cross);
    const pair = pairs[Math.floor(random() * pairs.length)];
    const prefix = encodePrefixFromState(cross, pair);
    const raw = randomRaw(random, cross, pair);

    const id = `${prefix} ${raw}`;
    const config = rawToConfig(raw, cross, pair);
    if (seen.has(id) || !config || configToRaw(config) !== raw) continue;
    seen.add(id);
    if (suggestAlgs(interpreter, config, cross, pair).length === 0) continue;
    cases.push({ prefix, raw, cross, pair, config });
  }
  return cases;
}

function labelCase(input: CaseInput, algs: string[]): { algs: AlgSnapshot[]; ms: number } {
  const caseState = buildF2lCubeState(input.config, input.cross, input.pair);
  const pairColors: [Color, Color] = [COLOR_OF[input.pair[0]], COLOR_OF[input.pair[1]]];
  const startTime = performance.now();
  const labeled = algs.map((alg) => ({ alg, rows: labelF2lAlg(alg, caseState, pairColors) }));
  return { algs: labeled, ms: performance.now() - startTime };
}

function formatRows(rows: F2lBreakdownRow[] | null): string {
  if (!rows) return '    (no labels)';
  return rows
    .map((row) => {
      const segments = row.segments.map((s) => `${s.moves.join(' ').padEnd(16)} ${s.label ?? '-'}`);
      return row.name ? `    [${row.name}]\n${segments.map((s) => `      ${s}`).join('\n')}` : `    ${segments[0]}`;
    })
    .join('\n');
}

function writeSnapshot(cases: CaseSnapshot[]) {
  const lines = cases.map((c) => {
    const algLines = c.algs.map((a) => `      ${JSON.stringify(a)}`).join(',\n');
    return `  {"prefix": ${JSON.stringify(c.prefix)}, "raw": ${JSON.stringify(c.raw)}, "algs": [\n${algLines}\n  ]}`;
  });
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, `[\n${lines.join(',\n')}\n]\n`);
}

function runRecord(interpreter: SimpleCubeInterpreter) {
  let labelMs = 0;
  const snapshots = pickCases(interpreter).map((input) => {
    const labeled = labelCase(input, suggestAlgs(interpreter, input.config, input.cross, input.pair));
    labelMs += labeled.ms;
    return { prefix: input.prefix, raw: input.raw, algs: labeled.algs };
  });
  writeSnapshot(snapshots);
  const algCount = snapshots.reduce((sum, c) => sum + c.algs.length, 0);
  console.log(`Recorded ${snapshots.length} cases, ${algCount} algs to ${path.relative(process.cwd(), SNAPSHOT_PATH)}`);
  console.log(`labelF2lAlg time: ${labelMs.toFixed(0)}ms`);
}

function runCompare(interpreter: SimpleCubeInterpreter) {
  const snapshots = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')) as CaseSnapshot[];
  let labelMs = 0;
  let algTotal = 0;
  let algListDiffs = 0;
  const labelDiffs: { id: string; alg: string; before: F2lBreakdownRow[] | null; after: F2lBreakdownRow[] | null }[] = [];

  for (const snapshot of snapshots) {
    const input = decodeCase(snapshot.prefix, snapshot.raw);
    const id = `${snapshot.prefix} ${snapshot.raw}`;

    const storedAlgs = snapshot.algs.map((a) => a.alg);
    const currentAlgs = suggestAlgs(interpreter, input.config, input.cross, input.pair);
    if (storedAlgs.join('|') !== currentAlgs.join('|')) {
      algListDiffs++;
      const removed = storedAlgs.filter((alg) => !currentAlgs.includes(alg));
      const added = currentAlgs.filter((alg) => !storedAlgs.includes(alg));
      console.log(`ALGS ${id}: ${removed.length} removed, ${added.length} added${removed.length + added.length ? '' : ', reordered'}`);
    }

    const relabeled = labelCase(input, storedAlgs);
    labelMs += relabeled.ms;
    for (const [i, stored] of snapshot.algs.entries()) {
      algTotal++;
      const after = relabeled.algs[i].rows;
      if (JSON.stringify(stored.rows) !== JSON.stringify(after)) {
        labelDiffs.push({ id, alg: stored.alg, before: stored.rows, after });
      }
    }
  }

  for (const diff of labelDiffs.slice(0, shownDiffs)) {
    console.log(`\nLABELS ${diff.id}: ${diff.alg}\n  before:\n${formatRows(diff.before)}\n  after:\n${formatRows(diff.after)}`);
  }
  if (labelDiffs.length > shownDiffs) console.log(`\n...${labelDiffs.length - shownDiffs} more label diffs (--show=N)`);

  const labelDiffRate = labelDiffs.length / algTotal;
  console.log(`\nCases: ${snapshots.length}, algs: ${algTotal}`);
  console.log(`Alg lists changed: ${algListDiffs}/${snapshots.length}`);
  console.log(`Labels changed: ${labelDiffs.length}/${algTotal} (${(labelDiffRate * 100).toFixed(1)}%, tolerance ${(tolerance * 100).toFixed(1)}%)`);
  console.log(`labelF2lAlg time: ${labelMs.toFixed(0)}ms`);

  const passed = algListDiffs === 0 && labelDiffRate <= tolerance;
  console.log(passed ? 'PASS' : 'FAIL');
  process.exit(passed ? 0 : 1);
}

const interpreter = buildInterpreter();
if (record) runRecord(interpreter);
else runCompare(interpreter);
