import type { FeedbackNote, ReviewFeedback } from '../../components/recon/FeedbackNotes';
import { FEEDBACK_CATEGORY_ORDER, type FeedbackCategory } from '../../utils/sharedConstants';
import type { Algset, StepInfo, Suggestion } from './SimpleCubeInterpreter';
import type { Handedness } from '../useSettings';
import AlgSpeedEstimator from './AlgSpeedEstimator';
import { removeRedundantMoves, reviewRedundantMoves, type RedundancyReview } from './redundantMoves';
import { MAX_SHOWN_SUGGESTIONS } from './suggestionRanking';
import type { KnownLLAlg } from './LLsuggester';
import type { CompilableLLStep } from './LLinterpreter';

export interface CubeStateReader {
  handedness: Handedness;
  readSteps: (moves: readonly string[]) => StepInfo[];
  readSuggestions: (moves: readonly string[]) => Suggestion[];
  findKnownAlgs: (alg: string) => KnownLLAlg[];
  findOppositeHandKnownAlgs: (alg: string) => KnownLLAlg[];
}

export interface AlgLine {
  movesBefore: readonly string[];
  lineMoves: readonly string[];
  nextLineMoves: readonly string[] | null;
}

export interface ReviewedAlg {
  alg: string;
  algset?: Algset;
}

export interface AlgReview extends ReviewFeedback {
  redundancy: RedundancyReview;
  suggestions: ReviewedAlg[];
}

const SPEED_RATIO_CEILINGS: readonly [FeedbackCategory, number][] = [
  ['great', 1],
  ['good', 1.15],
  ['okay', 1.35],
];

const UNKNOWN_ALG_SPEED_NOTES: Record<FeedbackCategory, string> = {
  great: `Not a known alg, but it's estimated to be reasonably fast.`,
  good: `Not a known alg, and it might be a little slow.`,
  okay: `Not a known alg, and it looks like it might be slow.`,
  bad: `Not a known alg, and it's likely much slower than known algs.`,
};

const OPPOSITE_HAND_MATCH_NOTES: Record<Handedness, string> = {
  right: `Known lefty alg, but righty solvers don't usually use it. Consider learning a righty alg`,
  left: `Known righty alg, but lefty solvers don't usually use it. Consider learning a lefty alg`,
};

interface PopularityTier {
  prefix: string;
  word: string;
  floor: number;
}

const POPULARITY_TIERS: readonly PopularityTier[] = [
  { prefix: '', word: 'Most popular', floor: 1 },
  { prefix: '', word: 'Common', floor: 0.5 },
  { prefix: '', word: 'Uncommon', floor: 0.1 },
  { prefix: '', word: 'Rare', floor: 0 },
];

const POPULARITY_SUFFIX = ' alg for this case';

const POPULARITY_SOURCE_URLS: Partial<Record<Algset, string>> = {
  pll: 'https://reco.nz/algs/pll',
  oll: 'https://reco.nz/algs/oll',
};

const LL_STEPS = ['eo', 'co', 'ep', 'cp'] as const;
type LLStep = typeof LL_STEPS[number];

interface PartialCompletion {
  stepSet: 'OLL' | 'PLL';
  solvedStep: LLStep;
}

function readLLSteps(reader: CubeStateReader, moves: readonly string[]): ReadonlySet<string> {
  const steps = reader.readSteps(moves);
  return steps.some(step => step.type === 'solved')
    ? new Set(LL_STEPS)
    : new Set(steps.filter(step => step.type === 'last layer').map(step => step.step));
}

const isOriented = (steps: ReadonlySet<string>) => steps.has('eo') && steps.has('co');
const isPermuted = (steps: ReadonlySet<string>) => steps.has('ep') && steps.has('cp');

function findLineAlgset(before: ReadonlySet<string>, after: ReadonlySet<string>): CompilableLLStep {
  if (isOriented(before)) return 'pll';
  const isZBLL = before.has('eo') && LL_STEPS.every(step => after.has(step));
  return isZBLL ? 'zbll' : 'oll';
}

function findPartialCompletion(
  { movesBefore, lineMoves, nextLineMoves }: AlgLine,
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  reader: CubeStateReader,
): PartialCompletion | null {
  const firstGained = (candidates: readonly LLStep[]) => candidates.find(step => after.has(step) && !before.has(step));

  if (!isOriented(before) && !isOriented(after)) {
    const solvedStep = firstGained(['eo', 'co']);
    if (!solvedStep) return null;
    const afterNextLine = nextLineMoves && readLLSteps(reader, [...movesBefore, ...lineMoves, ...nextLineMoves]);
    const isZBLLSetup = solvedStep === 'eo' && afterNextLine !== null && LL_STEPS.every(step => afterNextLine.has(step));
    return isZBLLSetup ? null : { stepSet: 'OLL', solvedStep };
  }

  if (isOriented(before) && isOriented(after) && !isPermuted(after)) {
    const solvedStep = firstGained(['ep', 'cp']);
    return solvedStep ? { stepSet: 'PLL', solvedStep } : null;
  }

  return null;
}

function reviewSelection(
  userAlg: string,
  knownAlg: KnownLLAlg | null,
  partialCompletion: PartialCompletion | null,
  shownSuggestions: readonly Suggestion[],
  reader: CubeStateReader,
): FeedbackNote {
  if (knownAlg) {
    const text = partialCompletion ? `Known ${knownAlg.algset.toUpperCase()} alg` : 'Matches a known alg';
    return { category: 'great', text };
  }

  if (reader.findOppositeHandKnownAlgs(userAlg).length > 0) {
    return { category: 'good', text: OPPOSITE_HAND_MATCH_NOTES[reader.handedness] };
  }

  if (shownSuggestions.length === 0) return { category: null, text: 'No known algs to compare against' };

  const userTime = new AlgSpeedEstimator(reader.handedness).calcScore(userAlg);
  const slowestTime = Math.max(...shownSuggestions.map(suggestion => suggestion.time));
  const speedRatio = userTime / slowestTime;
  const category = SPEED_RATIO_CEILINGS.find(([, ceiling]) => speedRatio <= ceiling)?.[0] ?? 'bad';
  return { category, text: UNKNOWN_ALG_SPEED_NOTES[category] };
}

function popularityNote({ algset, frequency, topCaseFrequency }: KnownLLAlg): FeedbackNote | null {
  if (topCaseFrequency <= 0) return null;

  const popularityShare = frequency / topCaseFrequency;
  const { prefix, word } = POPULARITY_TIERS.find(tier => popularityShare >= tier.floor) ?? POPULARITY_TIERS[POPULARITY_TIERS.length - 1];
  const popularitySource = POPULARITY_SOURCE_URLS[algset];
  const linkedWord = popularitySource ? { text: word, href: popularitySource } : word;
  return { category: null, text: [prefix, linkedWord, POPULARITY_SUFFIX] };
}

function gradeAlg(selectionCategory: FeedbackCategory | null, mistakeCount: number, hasPartialCompletion: boolean): FeedbackCategory | null {
  if (hasPartialCompletion) return 'bad';
  if (!selectionCategory) return null;
  const gradeIndex = Math.min(FEEDBACK_CATEGORY_ORDER.indexOf(selectionCategory) + mistakeCount, FEEDBACK_CATEGORY_ORDER.length - 1);
  return FEEDBACK_CATEGORY_ORDER[gradeIndex];
}

export function reviewAlg(algLine: AlgLine, reader: CubeStateReader): AlgReview {
  const userAlg = removeRedundantMoves(algLine.lineMoves).join(' ');
  const before = readLLSteps(reader, algLine.movesBefore);
  const after = readLLSteps(reader, [...algLine.movesBefore, ...algLine.lineMoves]);
  const partialCompletion = findPartialCompletion(algLine, before, after, reader);

  const lineAlgset = findLineAlgset(before, after);
  const knownAlgs = reader.findKnownAlgs(userAlg);
  const knownAlg = knownAlgs.find(known => known.algset === lineAlgset) ?? knownAlgs[0] ?? null;
  const isSolvedByKnownAlg = knownAlg !== null && partialCompletion === null;
  const shownSuggestions = isSolvedByKnownAlg ? [] : reader.readSuggestions(algLine.movesBefore).slice(0, MAX_SHOWN_SUGGESTIONS);

  const selectionNote = reviewSelection(userAlg, knownAlg, partialCompletion, shownSuggestions, reader);
  const popularity = knownAlg && popularityNote(knownAlg);
  const redundancy = reviewRedundantMoves(algLine.lineMoves);

  const notes: FeedbackNote[] = [];
  if (partialCompletion) {
    const { stepSet, solvedStep } = partialCompletion;
    notes.push({ category: 'bad', text: `Only solved part of ${stepSet}. Learn full ${stepSet} to skip this step` });
  }
  notes.push(selectionNote);
  if (popularity) notes.push(popularity);
  notes.push(...redundancy.notes);

  const category = gradeAlg(selectionNote.category, redundancy.mistakeCount, partialCompletion !== null);

  const reviewedSuggestions = shownSuggestions
    .toSorted((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
    .map(suggestion => ({ alg: suggestion.alg, algset: suggestion.algset }));

  return { category, notes, redundancy, suggestions: reviewedSuggestions };
}
