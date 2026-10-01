import { applyMoves } from './faceletCube';
import type { Facelets } from './faceletCube';
import { findCrossSolutions } from './crossSolver';
import type { CrossSolution, PairDisturbance } from './crossSolver';
import { effectiveToActualColor, getF2LPairStatus, readHashStateFromFacelets } from './cubeHashState';
import type { HashState } from './cubeHashState';
import { buildF2LPairQueries, reconstructF2LAlg } from './f2lPairLookup';
import { replacementTable_Y } from './transformHTML';
import type { BestPairScore, F2LPairQuery, F2LScoreIndex } from './f2lPairLookup';

export type ContinuationCategory = 'great' | 'good' | 'okay' | 'bad';

export type PairColors = [string, string];

export interface RatedCrossSolution {
  yRotation: string;
  cross: string[];
  crossColor: string;
  solvedPairs: PairColors[];
  continuation: string;
  continuationPair: PairColors | null;
  crossScore: number;
  continuationScore: number;
  totalScore: number;
  category: ContinuationCategory;
  pairDisturbances: PairDisturbance[];
}

const F2L_ONLY = new Set(['f2l']);
const DEFAULT_LIMIT = 20;
const EFFECTIVE_DOWN_COLOR = 'yellow';
export const Y_ROTATIONS: readonly string[] = ['', 'y', 'y2', "y'"];
const NO_Y_ROTATION: readonly string[] = [''];

const CATEGORY_CEILINGS: readonly [ContinuationCategory, number][] = [
  ['great', 0.6],
  ['good', 0.8],
  ['okay', 1.25],
];

export function categorizeContinuation(continuationScore: number): ContinuationCategory {
  return CATEGORY_CEILINGS.find(([, ceiling]) => continuationScore <= ceiling)?.[0] ?? 'bad';
}

interface BestContinuation {
  query: F2LPairQuery;
  match: BestPairScore;
}

type PairScoreCache = Map<string, BestPairScore | null>;

function findBestPairScore(query: F2LPairQuery, index: F2LScoreIndex, cache: PairScoreCache): BestPairScore | null {
  const cached = cache.get(query.key);
  if (cached !== undefined) return cached;

  const match = index.bestPairScore(query, F2L_ONLY);
  cache.set(query.key, match);
  return match;
}

function findBestContinuation(state: HashState, index: F2LScoreIndex, cache: PairScoreCache): BestContinuation | null {
  let best: BestContinuation | null = null;
  for (const query of buildF2LPairQueries(state)) {
    const match = findBestPairScore(query, index, cache);
    if (match && (!best || match.score < best.match.score)) {
      best = { query, match };
    }
  }
  return best;
}

export function bestContinuationScore(facelets: Facelets, index: F2LScoreIndex): number {
  const state = readHashStateFromFacelets(facelets);
  const best = state ? findBestContinuation(state, index, new Map()) : null;
  return best?.match.score ?? Infinity;
}

function continuationText(index: F2LScoreIndex, best: BestContinuation | null): string {
  if (!best) return '';
  const { query, match } = best;
  const entry = index.entry(match.entryIndex);
  return reconstructF2LAlg(entry.alg, entry.eoValue, query.q, query.isTopLayer, false, query.eoValue).alg;
}

function findSolvedPairs(state: HashState, crossColor: string): PairColors[] {
  return getF2LPairStatus(state, crossColor)
    .filter(pair => pair.isSolved)
    .map(pair => pair.pairColors);
}

interface CrossAngle {
  yRotation: string;
  cross: string[];
  crossScore: number;
}

const relabelForYTurns = (moves: readonly string[], yTurns: number): string[] =>
  moves.map(move => {
    let relabeled = move;
    for (let turn = 0; turn < yTurns; turn++) relabeled = replacementTable_Y[relabeled];
    return relabeled;
  });

function listCrossAngles(moves: string[], index: F2LScoreIndex, yRotations: readonly string[]): CrossAngle[] {
  return yRotations.map(yRotation => {
    const cross = relabelForYTurns(moves, Y_ROTATIONS.indexOf(yRotation));
    return { yRotation, cross, crossScore: index.scoreAlg(cross.join(' ')) };
  });
}

function findFastestAngle(faceletsAfterCross: Facelets, angles: CrossAngle[], index: F2LScoreIndex, cache: PairScoreCache) {
  let fastest = null;
  for (const angle of angles.toSorted((a, b) => a.crossScore - b.crossScore)) {
    if (fastest && angle.crossScore >= fastest.totalScore) break;

    const rotatedState = readHashStateFromFacelets(applyMoves(faceletsAfterCross, angle.yRotation ? [angle.yRotation] : []));
    const best = rotatedState ? findBestContinuation(rotatedState, index, cache) : null;
    const continuationScore = best?.match.score ?? Infinity;
    const totalScore = angle.crossScore + continuationScore;
    if (!fastest || totalScore < fastest.totalScore) {
      fastest = { ...angle, best, continuationScore, totalScore };
    }
  }
  return fastest!;
}

function rateCrossSolution(
  facelets: Facelets,
  { moves, pairDisturbances }: CrossSolution,
  index: F2LScoreIndex,
  yRotations: readonly string[],
  cache: PairScoreCache,
) {
  const faceletsAfterCross = applyMoves(facelets, moves);
  const state = readHashStateFromFacelets(faceletsAfterCross);
  const crossColor = state ? effectiveToActualColor(state.rotation, EFFECTIVE_DOWN_COLOR) : '';
  return {
    ...findFastestAngle(faceletsAfterCross, listCrossAngles(moves, index, yRotations), index, cache),
    crossColor,
    solvedPairs: state ? findSolvedPairs(state, crossColor) : [],
    pairDisturbances,
  };
}

export function rateCrossSolutions(
  facelets: Facelets,
  index: F2LScoreIndex,
  options: { limit?: number; keepMoves?: (moves: readonly string[]) => boolean; yRotations?: readonly string[] } = {},
): RatedCrossSolution[] {
  const { limit = DEFAULT_LIMIT, keepMoves, yRotations = NO_Y_ROTATION } = options;
  const cache: PairScoreCache = new Map();

  return findCrossSolutions(facelets, { maxSolutions: Infinity })
    .filter(({ moves }) => !keepMoves || keepMoves(moves))
    .map(solution => rateCrossSolution(facelets, solution, index, yRotations, cache))
    .sort((a, b) => b.solvedPairs.length - a.solvedPairs.length || a.totalScore - b.totalScore)
    .slice(0, limit)
    .map(({ best, ...solution }) => ({
      ...solution,
      continuation: continuationText(index, best),
      continuationPair: best?.query.pairColors ?? null,
      category: categorizeContinuation(solution.continuationScore),
    }));
}
