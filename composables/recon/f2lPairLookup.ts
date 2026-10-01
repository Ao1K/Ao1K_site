import type AlgSuggester from './ExactAlgSuggester';
import type { Doc, Query } from './ExactAlgSuggester';
import AlgSpeedEstimator from './AlgSpeedEstimator';
import type { Handedness } from '../useSettings';
import { splitLeadingAuf } from '../../utils/collapseAufVariants';
import {
  isTopLayerChar,
  canonicalizePair,
  rotateEOBits,
  aufTokenToVal,
  aufValToToken,
  combineAuf,
} from '../../utils/canonicalizeAuf';
import { combineMoves } from '../../utils/moveUtils';
import {
  CROSS_PIECE_INDICES,
  SOLVED_HASH,
  calcCrossColorsSolved,
  effectiveToActualColor,
  getF2LPairStatus,
} from './cubeHashState';
import type { HashState } from './cubeHashState';

export type HashAlgset = 'f2l' | 'zbls';
export type AlgsetFilter = ReadonlySet<string> | 'all';

export const toHashAlgset = (step: string | undefined): HashAlgset => (step === 'zbls' ? 'zbls' : 'f2l');

export const wantsEORanking = (algsets: AlgsetFilter) => algsets === 'all' || algsets.has('zbls');

export interface F2LPairQuery {
  query: Query;
  key: string;
  pairColors: [string, string];
  q: number;
  isTopLayer: boolean;
  isZBLSrelevant: boolean;
  eoValue: number;
}

/**
 * Whether a zbls alg could apply to this slot at all. Zbls entries are compiled with the other
 * three slots solved, so they can only match when this pair's own pieces sit in the top layer
 * or their own slot, and when every middle-layer edge outside this slot is already oriented.
 */
function checkZBLSrelevance(state: HashState, cornerIndex: number, edgeIndex: number): boolean {
  if (state.eoValue < 0) {
    return false;
  }

  const firstMiddleEdgePos = 8;
  const firstBottomCornerPos = 4;
  const middleEdgeEOmask = 0b1111 << firstMiddleEdgePos;

  const charIndex = (char: string) => char.charCodeAt(0) - 'a'.charCodeAt(0);
  const hash = state.hash;

  const edgePos = charIndex(hash[edgeIndex]) % 12;
  const homeEdgePos = charIndex(SOLVED_HASH[edgeIndex]) % 12;
  if (edgePos >= firstMiddleEdgePos && edgePos !== homeEdgePos) {
    return false;
  }

  const cornerPos = Math.floor(charIndex(hash[cornerIndex]) / 3);
  const homeCornerPos = Math.floor(charIndex(SOLVED_HASH[cornerIndex]) / 3);
  if (cornerPos >= firstBottomCornerPos && cornerPos !== homeCornerPos) {
    return false;
  }

  return (state.eoValue & middleEdgeEOmask & ~(1 << homeEdgePos)) === 0;
}

const EFFECTIVE_DOWN_COLOR = 'yellow';

const DOWN_CROSS_INDICES = Object
  .keys(CROSS_PIECE_INDICES)
  .find(key => CROSS_PIECE_INDICES[key] === EFFECTIVE_DOWN_COLOR)!
  .split(',')
  .map(Number);

/**
 * Generates separate queries for each unsolved F2L slot.
 * Each query requires only that specific slot to be solved.
 * @returns Array of query objects with the related pair colors (max 4)
 */
export function buildF2LPairQueries(state: HashState): F2LPairQuery[] {
  // assume cross must be on bottom
  const downColor = effectiveToActualColor(state.rotation, EFFECTIVE_DOWN_COLOR);
  const crossColorsSolved = calcCrossColorsSolved(state);

  // just proceed as though effective yellow cross is solved
  const isDownCrossSolved = crossColorsSolved.length === 0 || crossColorsSolved.includes(downColor);
  if (!isDownCrossSolved) {
    console.warn('No cross solved on bottom. Cannot generate F2L queries.');
    return [];
  }

  const pairStatus = getF2LPairStatus(state, downColor);
  const hash = state.hash;
  const crossKey = DOWN_CROSS_INDICES.map(index => hash[index]).join('');
  const solvedPairsKey = pairStatus
    .filter(pair => pair.isSolved)
    .map(({ pairIndices: [cornerIndex, edgeIndex] }) => `${cornerIndex}${hash[cornerIndex]}${edgeIndex}${hash[edgeIndex]}`)
    .join(',');

  return pairStatus.filter(pair => !pair.isSolved).map((pair) => {
    const query: Query = {
      positions: {}
    };

    // Cross pieces must stay solved
    DOWN_CROSS_INDICES.forEach((index) => {
      query.positions[index] = { must: [hash[index]] };
    });

    // Already solved F2L pairs must stay solved
    pairStatus.filter(otherPair => otherPair.isSolved).forEach((otherPair) => {
      const [cornerIndex, edgeIndex] = otherPair.pairIndices;
      query.positions[edgeIndex] = { must: [hash[edgeIndex]] };
      query.positions[cornerIndex] = { must: [hash[cornerIndex]] };
    });

    // query must look for pieces in this unsolved position
    const [cornerIndex, edgeIndex] = pair.pairIndices;
    const cornerPosition = hash[cornerIndex];
    const edgePosition = hash[edgeIndex];

    // canonicalize this pair's own two characters so a single exact-match search works
    // regardless of which of the four U-layer positions the live pair is in (see
    // docs/auf-canonical-search.md section 4). Cross and solved-pair pieces sit in the E and D
    // layers, so no U turn moves them and they don't need this.
    const isTopLayer = isTopLayerChar('corner', cornerPosition) || isTopLayerChar('edge', edgePosition);
    const { cornerChar: canonicalCorner, edgeChar: canonicalEdge, q } = canonicalizePair(cornerPosition, edgePosition);

    query.positions[edgeIndex] = { must: [canonicalEdge] };
    query.positions[cornerIndex] = { must: [canonicalCorner] };

    return {
      query,
      key: `${crossKey}|${solvedPairsKey}|${cornerIndex}${canonicalCorner}${edgeIndex}${canonicalEdge}${q}${isTopLayer ? 't' : 'b'}`,
      pairColors: [pair.pairColors[0], pair.pairColors[1]],
      q,
      isTopLayer,
      isZBLSrelevant: checkZBLSrelevance(state, cornerIndex, edgeIndex),
      eoValue: state.eoValue,
    };
  });
}

const prependAuf = (token: string, text: string): string => {
  const tokens = [token, ...text.trim().split(/\s+/)].filter(Boolean);
  const combined = combineMoves(tokens).join(' ').trim();
  // U and y rotate about the same axis and always commute; reorder to the codebase's
  // established "y before U" display convention (see reorderAnglingInAlg in AlgCompiler.tsx)
  return combined.replace(/^(U'?2?)\s+(y'?2?)/, '$2 $1');
};

const EO_AUF_CANDIDATES = ['', 'U', "U'", 'U2'].map(aufTokenToVal);

interface SplitAlg {
  coreKey: string;
  entryAuf: number;
}

function splitAlg(algText: string): SplitAlg {
  const { coreKey, aufPart } = splitLeadingAuf(algText);
  return { coreKey, entryAuf: aufTokenToVal(aufPart) };
}

interface F2LAlgPlan {
  coreKey: string;
  auf: number | null;
  hasEOsolved: boolean;
}

function planF2LAlg(
  { coreKey, entryAuf }: SplitAlg,
  algEOvalue: number | undefined,
  q: number,
  isTopLayer: boolean,
  wantsEORanking: boolean,
  currentEO: number,
): F2LAlgPlan {
  if (isTopLayer) {
    // the piece is forced to move under any leading AUF, so the reconstructed rotation m is
    // forced too: strip the compiled alg's own leading rotation and recombine it with q.
    const hasEOsolved = algEOvalue !== undefined && currentEO >= 0 && rotateEOBits(currentEO, q) === algEOvalue;
    return { coreKey, auf: combineAuf(q, entryAuf), hasEOsolved };
  }

  // neither of this pair's pieces is in the U layer, so no AUF is needed to solve the pair
  // itself: the matched entry's own leading AUF only distinguished other pairs during
  // canonicalization, so drop it and shift its effect out of the stored eoValue. When we want
  // EO ranking, a leading AUF may still be worth adding purely to also solve EO. Try smallest
  // AUF first ('', U, U', U2); a currentEO whose low 4 bits are all-0 or all-1 is
  // rotation-invariant and could match more than one candidate, so order matters there.
  const coreEOsolvedAt = (m: number): boolean =>
    algEOvalue !== undefined && currentEO >= 0
    && rotateEOBits(currentEO, m) === rotateEOBits(algEOvalue, entryAuf);

  if (wantsEORanking) {
    const eoAuf = EO_AUF_CANDIDATES.find(coreEOsolvedAt);
    if (eoAuf !== undefined) {
      return { coreKey, auf: eoAuf, hasEOsolved: true };
    }
  }

  return { coreKey, auf: null, hasEOsolved: coreEOsolvedAt(0) };
}

const planText = ({ coreKey, auf }: Pick<F2LAlgPlan, 'coreKey' | 'auf'>) =>
  auf === null ? coreKey : prependAuf(aufValToToken(auf), coreKey);

/**
 * Reconstructs the preAUF-correct alg text and EO-solved signal for a matched compiled alg,
 * per the two cases in docs/auf-canonical-search.md section 5. `algText`/`algEOvalue` are the
 * matched compiled entry's own stored alg text and eoValue; `q` is this pair's canonicalizing
 * turn from buildF2LPairQueries.
 */
export function reconstructF2LAlg(
  algText: string,
  algEOvalue: number | undefined,
  q: number,
  isTopLayer: boolean,
  wantsEORanking: boolean,
  currentEO: number,
): { alg: string; hasEOsolved: boolean } {
  const plan = planF2LAlg(splitAlg(algText), algEOvalue, q, isTopLayer, wantsEORanking, currentEO);
  return { alg: planText(plan), hasEOsolved: plan.hasEOsolved };
}

const AUF_COUNT = 4;

export interface BestPairScore {
  score: number;
  entryIndex: number;
  auf: number;
}

export class F2LScoreIndex {
  private readonly estimator: AlgSpeedEstimator;
  private readonly splits: SplitAlg[] = [];
  private readonly scores: number[] = [];

  constructor(private readonly suggester: AlgSuggester, handedness: Handedness) {
    this.estimator = new AlgSpeedEstimator(handedness);
  }

  private get docs(): Doc[] {
    return this.suggester.getIndexData()?.docs ?? [];
  }

  entry(entryIndex: number): Doc {
    return this.docs[entryIndex];
  }

  scoreAlg(alg: string): number {
    return this.estimator.calcScore(alg);
  }

  private splitAt(entryIndex: number): SplitAlg {
    return this.splits[entryIndex] ??= splitAlg(this.docs[entryIndex].alg);
  }

  private scoreAt(entryIndex: number, auf: number): number {
    const key = entryIndex * AUF_COUNT + auf;
    const cached = this.scores[key];
    if (cached !== undefined) return cached;

    return this.scores[key] = this.estimator.calcScore(planText({ coreKey: this.splitAt(entryIndex).coreKey, auf }));
  }

  bestPairScore(pairQuery: F2LPairQuery, algsets: AlgsetFilter): BestPairScore | null {
    const { query, q, isTopLayer, isZBLSrelevant, eoValue } = pairQuery;
    const docs = this.docs;
    const wantsEO = wantsEORanking(algsets);
    let best: BestPairScore | null = null;

    for (const entryIndex of this.suggester.matchingDocIndices(query)) {
      const doc = docs[entryIndex];
      const algset = toHashAlgset(doc.step);
      if (algsets !== 'all' && !algsets.has(algset)) continue;
      if (algset === 'zbls' && !isZBLSrelevant) continue;

      const plan = planF2LAlg(this.splitAt(entryIndex), doc.eoValue, q, isTopLayer, wantsEO, eoValue);
      if (algset === 'zbls' && !plan.hasEOsolved) continue;

      const auf = plan.auf ?? 0;
      const score = this.scoreAt(entryIndex, auf);
      if (!best || score < best.score) {
        best = { score, entryIndex, auf };
      }
    }

    return best;
  }
}
