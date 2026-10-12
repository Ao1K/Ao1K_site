import type { ReviewFeedback } from '../../components/recon/FeedbackNotes';
import type { StepInfo } from './SimpleCubeInterpreter';

export type F2LReview = ReviewFeedback;

export function reviewF2L(lineMoves: readonly string[], stepInfo: StepInfo): F2LReview {
  return { category: null, notes: [] };
}
