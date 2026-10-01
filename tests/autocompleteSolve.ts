// some runs will fail due to f2l solver not having solutions to all possible cases, especially bad ones

import * as fs from 'fs';
import * as path from 'path';
import { SimpleCube } from '../composables/recon/SimpleCube';
import { SimpleCubeInterpreter } from '../composables/recon/SimpleCubeInterpreter';
import type { Doc } from '../composables/recon/ExactAlgSuggester';
import type { CompiledLLAlg } from '../composables/recon/LLsuggester';
import { applyMovesUntilCross, getCrossSuggestions } from '../composables/recon/crossAutocomplete';

type Stage = 'c1' | 'pairs2to4' | 'll';

interface SolveResult {
  scramble: string;
  steps: { stage: Stage; alg: string }[];
  moveCounts: Record<Stage | 'total', number>;
  error?: string;
}

const MAX_STEPS = 20;
const HANDEDNESS = 'right';

const args = process.argv.slice(2);
const count = Number(args.find(arg => arg.startsWith('--count='))?.split('=')[1] ?? 100);
const useZbls = !args.includes('--no-zbls');
const useZbll = !args.includes('--no-zbll');
const verbose = args.includes('--verbose');

const loadAlgs = (fileName: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '../public/recon', fileName), 'utf8')).algorithms;

function buildInterpreter(): SimpleCubeInterpreter {
  const interpreter = new SimpleCubeInterpreter();
  interpreter.addAlgset('f2l', loadAlgs('compiled-f2l-algs.json') as Doc[]);
  if (useZbls) interpreter.addAlgset('zbls', loadAlgs('compiled-zbls-algs.json') as Doc[]);
  interpreter.addAlgset('oll', loadAlgs('compiled-oll-righty-algs.json') as CompiledLLAlg[], HANDEDNESS);
  interpreter.addAlgset('pll', loadAlgs('compiled-pll-righty-algs.json') as CompiledLLAlg[], HANDEDNESS);
  if (useZbll) interpreter.addAlgset('zbll', loadAlgs('compiled-zbll-righty-algs.json') as CompiledLLAlg[], HANDEDNESS);
  return interpreter;
}

const enabledAlgsets = new Set([
  'cross', 'f2l', 'oll', 'pll',
  ...(useZbls ? ['zbls'] : []),
  ...(useZbll ? ['zbll'] : []),
]);

const tokenize = (alg: string) => alg.trim().split(/\s+/).filter(Boolean);
const countMoves = (alg: string) => tokenize(alg).filter(move => !/^[xyz]/.test(move)).length;

const stageForPairsSolved = (pairsSolved: number): Stage =>
  pairsSolved === 0 ? 'c1' : pairsSolved < 4 ? 'pairs2to4' : 'll';

function solve(scramble: string, interpreter: SimpleCubeInterpreter): SolveResult {
  const scrambleMoves = tokenize(scramble);
  const solutionMoves: string[] = [];
  const steps: SolveResult['steps'] = [];
  const moveCounts = { c1: 0, pairs2to4: 0, ll: 0, total: 0 };
  const result: SolveResult = { scramble, steps, moveCounts };

  const acceptAlg = (stage: Stage, alg: string) => {
    steps.push({ stage, alg });
    solutionMoves.push(...tokenize(alg));
    moveCounts[stage] += countMoves(alg);
    moveCounts.total += countMoves(alg);
  };

  const crossFacelets = applyMovesUntilCross([scrambleMoves]);
  const index = interpreter.getF2LScoreIndex(HANDEDNESS);
  if (crossFacelets && index) {
    const crossAlg = getCrossSuggestions(crossFacelets, [], index)[0]?.alg;
    if (!crossAlg) return { ...result, error: 'no cross suggestion' };
    acceptAlg('c1', crossAlg);
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    const cubeState = new SimpleCube().getCubeState([...scrambleMoves, ...solutionMoves]);
    const stepsCompleted = interpreter.getStepsCompleted(cubeState);
    if (interpreter.isCubeSolved()) return result;

    const pairsSolved = stepsCompleted.filter(s => s.type === 'f2l').length;
    const alg = interpreter.getAlgSuggestions(stepsCompleted, { enabledAlgsets, handedness: HANDEDNESS })[0]?.alg;
    if (!alg) return { ...result, error: `no suggestion with ${pairsSolved} pairs solved` };
    acceptAlg(stageForPairsSolved(pairsSolved), alg);
  }

  return { ...result, error: `not solved after ${MAX_STEPS} steps` };
}

function summarize(values: number[]) {
  const sorted = values.toSorted((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    mean: mean.toFixed(2),
    median: sorted[Math.floor(sorted.length / 2)],
    stdDev: Math.sqrt(variance).toFixed(2),
    min: sorted[0],
    max: sorted.at(-1),
  };
}

async function main() {
  const { randomScrambleForEvent } = await import('cubing/scramble');
  const interpreter = buildInterpreter();
  const results: SolveResult[] = [];
  const startTime = performance.now();

  for (let i = 0; i < count; i++) {
    const scramble = (await randomScrambleForEvent('333')).toString();
    const result = solve(scramble, interpreter);
    results.push(result);
    if (verbose || result.error) {
      console.log(`#${i + 1} ${result.error ?? 'solved'}\n  scramble: ${scramble}\n${result.steps.map(s => `  ${s.stage}: ${s.alg}`).join('\n')}`);
    }
    if ((i + 1) % 50 === 0) console.error(`${i + 1}/${count}`);
  }

  const solved = results.filter(result => !result.error);
  const stages = ['c1', 'pairs2to4', 'll', 'total'] as const;
  const stageLabels = { c1: 'Cross+1st pair', pairs2to4: 'Pairs 2-4', ll: 'Last layer', total: 'Total' };

  console.log(`\nZBLS ${useZbls ? 'on' : 'off'}, ZBLL ${useZbll ? 'on' : 'off'}`);
  console.log(`Solved ${solved.length}/${results.length} in ${((performance.now() - startTime) / 1000).toFixed(1)}s`);
  console.table(Object.fromEntries(stages.map(stage =>
    [stageLabels[stage], summarize(solved.map(result => result.moveCounts[stage]))])));
  process.exit(solved.length === results.length ? 0 : 1);
}

void main();
