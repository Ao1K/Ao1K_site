import { applyMoves, faceOfSticker, solvedFacelets } from './faceletCube';
import type { Facelets } from './faceletCube';
import { calcCrossColorsSolved, FACE_COLOR_NAMES, getF2LPairStatus, readHashStateFromFacelets } from './cubeHashState';
import { applyMovesSafely } from './crossAutocomplete';
import { bestContinuationScore, rateCrossSolutions, Y_ROTATIONS } from './crossContinuations';
import type { RatedCrossSolution } from './crossContinuations';
import type { F2LScoreIndex } from './f2lPairLookup';
import { combineMoves } from '../../utils/moveUtils';
import simplifyRotations from './simplifyRotations';
import type { FeedbackNote, FeedbackNoteCategory } from '../../components/recon/FeedbackNotes';

export type CrossPickCategory = 'fewestMoves' | 'fastest' | 'easiestContinuation';

export type CrossFeedbackCategory = 'great' | 'good' | 'okay' | 'needsWork' | 'unknown';

type ContinuationFeedbackCategory = Exclude<CrossFeedbackCategory, 'needsWork' | 'unknown'>;

export interface CrossFeedback {
  category: CrossFeedbackCategory;
  notes: FeedbackNote[];
}

export interface ReviewedCross {
  solution: RatedCrossSolution;
  shownMoves: string[];
  continuationDisturbance: number;
  isUserCross: boolean;
}

export interface CrossPick {
  categories: CrossPickCategory[];
  cross: ReviewedCross;
}

export interface CrossReview {
  lineIndex: number;
  feedback: CrossFeedback;
  picks: CrossPick[];
  others: ReviewedCross[];
}

const POOL_SIZE = 20;
const DISTURBANCE_WEIGHT = 0.4;
const D_CENTER_FACELET = 13;
const ROTATIONS_TO_D = [[], ['x'], ["x'"], ['x2'], ['z'], ["z'"]];

const MOVES_PER_CONTINUATION_SECOND = 4;
const SCORE_CEILINGS: readonly [CrossFeedbackCategory, number][] = [
  ['great', 1.25],
  ['good', 2.25],
  ['okay', 3.25],
];
const CONTINUATION_GAP_CEILINGS: readonly [ContinuationFeedbackCategory, number][] = [
  ['great', 0.15],
  ['good', 0.35],
];
const CONTINUATION_NOTES: Record<ContinuationFeedbackCategory, string> = {
  great: 'Great continuation compared to alternatives',
  good: 'Average continuation compared to alternatives',
  okay: 'Weaker continuation than alternatives',
};

const isRotation = (move: string) => /^[xyz]/.test(move);

const solvedCrossColors = (facelets: Facelets): string[] => {
  const state = readHashStateFromFacelets(facelets);
  return state ? calcCrossColorsSolved(state) : [];
};

const downColor = (facelets: Facelets) => FACE_COLOR_NAMES[faceOfSticker(facelets[D_CENTER_FACELET])];

const rotationToDown = (facelets: Facelets, color: string) =>
  ROTATIONS_TO_D.find(rotation => downColor(applyMoves(facelets, rotation)) === color)!;

interface CrossLine {
  lineIndex: number;
  faceletsBeforeLine: Facelets;
  crossColor: string;
}

function findCrossLine(scrambleMoves: readonly string[], solutionLines: readonly (readonly string[])[]): CrossLine | null {
  let facelets = applyMovesSafely(solvedFacelets(), scrambleMoves);
  if (!facelets || solvedCrossColors(facelets).length > 0) return null;

  for (let lineIndex = 0; lineIndex < solutionLines.length; lineIndex++) {
    const next = applyMovesSafely(facelets, solutionLines[lineIndex]);
    if (!next) return null;
    const [crossColor] = solvedCrossColors(next);
    if (crossColor) return { lineIndex, faceletsBeforeLine: facelets, crossColor };
    facelets = next;
  }
  return null;
}

function continuationDisturbance({ continuationPair, pairDisturbances }: RatedCrossSolution): number {
  const disturbance = continuationPair && pairDisturbances.find(({ pairColors }) =>
    pairColors.every(color => continuationPair.includes(color)));
  return disturbance?.count ?? Infinity;
}

const lowest = <T>(items: T[], compare: (a: T, b: T) => number): T =>
  items.reduce((best, item) => compare(item, best) < 0 ? item : best);

const easeScore = ({ solution, continuationDisturbance }: ReviewedCross) =>
  // solution.continuationScore + DISTURBANCE_WEIGHT * continuationDisturbance;
  continuationDisturbance;

function groupPicks(bestByCategory: [CrossPickCategory, ReviewedCross][]): CrossPick[] {
  const picks: CrossPick[] = [];
  for (const [category, cross] of bestByCategory) {
    const existing = picks.find(pick => pick.cross === cross);
    if (existing) existing.categories.push(category);
    else picks.push({ categories: [category], cross });
  }
  return picks;
}

interface UserCrossScores {
  moveCount: number;
  solvedPairCount: number;
  continuationScore: number;
}

const pluralMoves = (count: number) => `${count} move${count === 1 ? '' : 's'}`;

const countTurns = (alg: string) => alg.split(' ').filter(move => move && !isRotation(move)).length;

function crossPlusOneMoveCount({ cross, solvedPairs, continuation }: RatedCrossSolution): number {
  if (solvedPairs.length > 0) return cross.length;
  return continuation ? cross.length + countTurns(continuation) : Infinity;
}

function buildXCrossMoveFeedback(moveCount: number, alternatives: readonly ReviewedCross[]) {
  const fewestCrossPlusOneMoves = Math.min(...alternatives.map(({ solution }) => crossPlusOneMoveCount(solution)));
  if (fewestCrossPlusOneMoves === Infinity) {
    return { moveGap: null, note: { category: null, text: "Can't compare xcross move count" } };
  }
  const moveGap = moveCount - fewestCrossPlusOneMoves;
  const text = moveGap === 0
    ? 'Same move count as shortest cross+1'
    : `${pluralMoves(Math.abs(moveGap))} ${moveGap < 0 ? 'less than' : 'more than'} shortest cross+1`;
  const note: FeedbackNote = { category: extraMovesNoteCategory(moveGap), text };
  return { moveGap, note };
}

const extraMovesNoteCategory = (extraMoves: number): FeedbackNoteCategory =>
  extraMoves <= 0 ? 'great' : extraMoves === 1 ? 'good' : extraMoves === 2 ? 'okay' : 'bad';

function categorizeCross(moveGap: number, continuationGap: number | null): CrossFeedbackCategory {
  const continuationMoveEquivalent = continuationGap !== null && Number.isFinite(continuationGap)
    ? continuationGap * MOVES_PER_CONTINUATION_SECOND
    : 0;
  const score = moveGap + continuationMoveEquivalent;
  return SCORE_CEILINGS.find(([, ceiling]) => score <= ceiling)?.[0] ?? 'needsWork';
}

function buildCrossFeedback(
  user: UserCrossScores,
  alternatives: readonly ReviewedCross[],
  otherCrosses: readonly ReviewedCross[],
): CrossFeedback {
  const comparable = otherCrosses.filter(({ solution }) => solution.solvedPairs.length >= user.solvedPairCount);
  const fastestComparable = comparable.length > 0
    ? lowest(comparable, (a, b) => a.solution.totalScore - b.solution.totalScore)
    : null;
  const continuationGap = fastestComparable && user.continuationScore - fastestComparable.solution.continuationScore;
  const continuationCategory = continuationGap === null
    ? null
    : CONTINUATION_GAP_CEILINGS.find(([, ceiling]) => continuationGap <= ceiling)?.[0] ?? 'okay';
  const continuationNotes: FeedbackNote[] = continuationCategory
    ? [{ category: continuationCategory, text: CONTINUATION_NOTES[continuationCategory] }]
    : [];

  if (user.solvedPairCount > 1) {
    const crossName = `${'x'.repeat(user.solvedPairCount)}cross`;
    const moveCountNote: FeedbackNote = { category: null, text: `Can't compare ${crossName} move count yet` };
    return { category: 'unknown', notes: [moveCountNote, ...continuationNotes] };
  }

  if (user.solvedPairCount === 1) {
    const { moveGap, note } = buildXCrossMoveFeedback(user.moveCount, otherCrosses);
    const category = moveGap === null ? 'unknown' : categorizeCross(moveGap, continuationGap);
    return { category, notes: [note, ...continuationNotes] };
  }

  const optimalLength = Math.min(...alternatives.map(({ solution }) => solution.cross.length));
  const extraMoves = user.moveCount - optimalLength;
  const moveCountNote: FeedbackNote = {
    category: extraMovesNoteCategory(extraMoves),
    text: extraMoves <= 0 ? 'Move-optimal' : `${pluralMoves(extraMoves)} over optimal`,
  };

  return { category: categorizeCross(extraMoves, continuationGap), notes: [moveCountNote, ...continuationNotes] };
}

function scoreUserCross(
  crossLine: CrossLine,
  userLine: readonly string[],
  userCrossMoves: readonly string[],
  index: F2LScoreIndex,
): UserCrossScores {
  const faceletsAfterLine = applyMoves(crossLine.faceletsBeforeLine, userLine);
  const crossDown = applyMoves(faceletsAfterLine, rotationToDown(faceletsAfterLine, crossLine.crossColor));
  return {
    moveCount: userCrossMoves.filter(move => !isRotation(move)).length,
    solvedPairCount: countSolvedPairs(faceletsAfterLine, crossLine.crossColor),
    continuationScore: bestContinuationScore(crossDown, index),
  };
}

function countSolvedPairs(facelets: Facelets, crossColor: string): number {
  const state = readHashStateFromFacelets(facelets);
  return state
    ? getF2LPairStatus(state, crossColor).filter(pair => pair.isSolved).length
    : 0;
}

export function hasCrossFeedback(scrambleMoves: readonly string[], solutionLines: readonly (readonly string[])[]): boolean {
  const crossLine = findCrossLine(scrambleMoves, solutionLines);
  if (!crossLine) return false;
  const faceletsAfterLine = applyMoves(crossLine.faceletsBeforeLine, solutionLines[crossLine.lineIndex]);

  // max pairs solved for feedback. Any more, and we can't give good feedback currently.
  const MAX_PAIRS = 1
  return countSolvedPairs(faceletsAfterLine, crossLine.crossColor) <= MAX_PAIRS;
}

export function reviewCross(
  scrambleMoves: readonly string[],
  solutionLines: readonly (readonly string[])[],
  index: F2LScoreIndex,
): CrossReview | null {
  const crossLine = findCrossLine(scrambleMoves, solutionLines);
  if (!crossLine) return null;

  const userLine = solutionLines[crossLine.lineIndex];
  const leadingRotationCount = userLine.findIndex(move => !isRotation(move));
  const userRotations = userLine.slice(0, leadingRotationCount === -1 ? userLine.length : leadingRotationCount);
  const userOrientation = applyMoves(crossLine.faceletsBeforeLine, userRotations);
  const extraRotation = rotationToDown(userOrientation, crossLine.crossColor);
  const setupMoves = [...userRotations, ...extraRotation];

  const userEndFacelets = applyMoves(crossLine.faceletsBeforeLine, [...userLine, ...extraRotation]);
  const matchesUserCross = (yRotation: string, shownMoves: readonly string[]) => {
    const userFaceletsAtAngle = applyMoves(userEndFacelets, yRotation ? [yRotation] : []);
    const crossFacelets = applyMoves(crossLine.faceletsBeforeLine, shownMoves);
    return crossFacelets.every((sticker, position) => sticker === userFaceletsAtAngle[position]);
  };

  const crosses: ReviewedCross[] = rateCrossSolutions(applyMoves(userOrientation, extraRotation), index, { limit: Infinity, yRotations: Y_ROTATIONS })
    .map(solution => {
      const setupRotations = [...setupMoves, solution.yRotation].filter(Boolean);
      const simplifiedRotations = setupRotations.length > 0
        ? simplifyRotations(setupRotations.join(' ')).filter(Boolean)
        : [];
      const shownMoves = combineMoves([...simplifiedRotations, ...solution.cross]);
      return {
        solution,
        shownMoves,
        continuationDisturbance: continuationDisturbance(solution),
        isUserCross: matchesUserCross(solution.yRotation, shownMoves),
      };
    });
  if (crosses.length === 0) return null;

  const pool = crosses.toSorted((a, b) => a.solution.totalScore - b.solution.totalScore).slice(0, POOL_SIZE);
  const fewestMoves = lowest(crosses, (a, b) =>
    a.solution.cross.length - b.solution.cross.length || a.solution.totalScore - b.solution.totalScore);
  const picks = groupPicks([
    ['fastest', pool[0]],
    ['fewestMoves', fewestMoves],
    ['easiestContinuation', lowest(pool, (a, b) => easeScore(a) - easeScore(b))],
  ]);
  const others = pool.filter(cross => !picks.some(pick => pick.cross === cross));
  const userScores = scoreUserCross(crossLine, userLine, userLine.slice(userRotations.length), index);
  const otherCrosses = crosses.filter(cross => !cross.isUserCross);
  const feedback = buildCrossFeedback(userScores, crosses, otherCrosses);

  return { lineIndex: crossLine.lineIndex, feedback, picks, others };
}
