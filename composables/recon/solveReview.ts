import type { LineIconDatum } from '../../components/recon/IconStack';
import type { ReviewFeedback } from '../../components/recon/FeedbackNotes';
import type { StepInfo } from './SimpleCubeInterpreter';
import { findCrossLine, hasCrossFeedback, reviewCross, type CrossLine, type CrossReview } from './crossReview';
import { reviewF2L, type F2LReview } from './f2lReview';
import { reviewAlg, type AlgReview, type CubeStateReader } from './algReview';
import { isOneAUFAway, isLastLayerDone, reviewAUF, WRONG_AUF_NOTE, type AUFReview } from './aufReview';
import type { F2LScoreIndex } from './f2lPairLookup';

export type LineReview =
  | { kind: 'cross'; value: CrossReview }
  | { kind: 'f2l'; value: F2LReview }
  | { kind: 'alg'; value: AlgReview }
  | { kind: 'auf'; value: AUFReview };

export interface SolveReview {
  lines: Map<number, LineReview>;
  takeaways: ReviewFeedback;
}

interface SolveLine {
  lineIndex: number;
  lineMoves: readonly string[];
  movesBefore: readonly string[];
  nextLineMoves: readonly string[] | null;
  isFinalLine: boolean;
  stepInfo: StepInfo | null;
}

interface SolveContext {
  crossLine: CrossLine | null;
  index: F2LScoreIndex | null;
  reader: CubeStateReader;
}

function pickLineReview(line: SolveLine, { crossLine, index, reader }: SolveContext): LineReview | null {
  const { lineIndex, lineMoves, movesBefore, nextLineMoves, isFinalLine, stepInfo } = line;

  if (isLastLayerDone(reader, movesBefore)) {
    return { kind: 'auf', value: reviewAUF([...movesBefore, ...lineMoves], lineMoves, isFinalLine, reader) };
  }

  const crossReview = index && crossLine?.lineIndex === lineIndex && reviewCross(crossLine, lineMoves, index);
  if (crossReview) return { kind: 'cross', value: crossReview };

  if (!stepInfo) return null;
  if (stepInfo.type === 'f2l') return { kind: 'f2l', value: reviewF2L(lineMoves, stepInfo) };

  if (isLastLayerAlgStep(stepInfo)) {
    return { kind: 'alg', value: reviewAlg({ movesBefore, lineMoves, nextLineMoves }, reader) };
  }

  return null;
}

function isLastLayerAlgStep(stepInfo: StepInfo): boolean {
  const isSolvingLastStep = stepInfo.type === 'solved' && stepInfo.step === 'solved' && stepInfo.nameType !== undefined;
  return stepInfo.type === 'last layer' || isSolvingLastStep;
}

export function hasReviewContent(
  scrambleMoves: readonly string[],
  solutionLines: readonly (readonly string[])[],
  lineIconData: readonly LineIconDatum[],
): boolean {
  if (hasCrossFeedback(scrambleMoves, solutionLines)) return true;

  return solutionLines.some((lineMoves, lineIndex) => {
    const stepInfo = lineIconData[lineIndex]?.compiledStepInfo;
    return lineMoves.length > 0 && !!stepInfo && (stepInfo.type === 'f2l' || isLastLayerAlgStep(stepInfo));
  });
}

function reviewLine(line: SolveLine, context: SolveContext): LineReview | null {
  const review = pickLineReview(line, context);
  if (!review || !line.isFinalLine || review.kind === 'auf') return review;

  if (isOneAUFAway(context.reader, [...line.movesBefore, ...line.lineMoves])) {
    review.value.notes.push(WRONG_AUF_NOTE);
    review.value.category = 'bad';
  }
  return review;
}

function reviewTakeaways(lineReviews: readonly LineReview[]): ReviewFeedback {
  return { category: null, notes: [] };
}

export function reviewSolve(
  scrambleMoves: readonly string[],
  solutionLines: readonly (readonly string[])[],
  lineIconData: readonly LineIconDatum[],
  index: F2LScoreIndex | null,
  reader: CubeStateReader,
): SolveReview {
  const context: SolveContext = { crossLine: findCrossLine(scrambleMoves, solutionLines), index, reader };
  const lines = new Map<number, LineReview>();

  solutionLines.forEach((lineMoves, lineIndex) => {
    if (lineMoves.length === 0) return;
    const nextLineMoves = solutionLines.slice(lineIndex + 1).find(moves => moves.length > 0) ?? null;
    const review = reviewLine({
      lineIndex,
      lineMoves,
      movesBefore: [...scrambleMoves, ...solutionLines.slice(0, lineIndex).flat()],
      nextLineMoves,
      isFinalLine: nextLineMoves === null,
      stepInfo: lineIconData[lineIndex]?.compiledStepInfo ?? null,
    }, context);
    if (review) lines.set(lineIndex, review);
  });

  return { lines, takeaways: reviewTakeaways([...lines.values()]) };
}
