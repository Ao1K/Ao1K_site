import type { LineIconDatum } from '../../components/recon/IconStack';
import { reviewCross, type CrossReview } from './crossReview';
import { reviewF2L, type F2LReview } from './f2lReview';
import { reviewAlg, type AlgReview, type CubeStateReader } from './algReview';
import type { F2LScoreIndex } from './f2lPairLookup';

export type LineReview =
  | { kind: 'cross'; value: CrossReview }
  | { kind: 'f2l'; value: F2LReview }
  | { kind: 'alg'; value: AlgReview };

export function reviewSolve(
  scrambleMoves: readonly string[],
  solutionLines: readonly (readonly string[])[],
  lineIconData: readonly LineIconDatum[],
  index: F2LScoreIndex | null,
  reader: CubeStateReader,
): Map<number, LineReview> {
  const reviews = new Map<number, LineReview>();

  lineIconData.forEach(({ compiledStepInfo }, lineIndex) => {
    const lineMoves = solutionLines[lineIndex];
    if (!compiledStepInfo || !lineMoves) return;
    const isSolvingLastStep = compiledStepInfo.type === 'solved' && compiledStepInfo.step === 'solved' && compiledStepInfo.nameType !== undefined;
    if (compiledStepInfo.type === 'f2l') {
      reviews.set(lineIndex, { kind: 'f2l', value: reviewF2L(lineMoves, compiledStepInfo) });
    } else if (compiledStepInfo.type === 'last layer' || isSolvingLastStep) {
      const movesBefore = [...scrambleMoves, ...solutionLines.slice(0, lineIndex).flat()];
      const nextLineMoves = solutionLines.slice(lineIndex + 1).find(moves => moves.length > 0) ?? null;
      reviews.set(lineIndex, { kind: 'alg', value: reviewAlg({ movesBefore, lineMoves, nextLineMoves }, reader) });
    }
  });

  const crossReview = index && reviewCross(scrambleMoves, solutionLines, index);
  if (crossReview) reviews.set(crossReview.lineIndex, { kind: 'cross', value: crossReview });

  return reviews;
}
