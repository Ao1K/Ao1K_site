import type { FeedbackNote } from '../../components/recon/FeedbackNotes';
import type { StepInfo } from './SimpleCubeInterpreter';

export interface F2LReview {
  notes: FeedbackNote[];
}

export function reviewF2L(lineMoves: readonly string[], stepInfo: StepInfo): F2LReview {
  return { notes: [] };
}
