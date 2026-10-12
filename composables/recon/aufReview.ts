import type { FeedbackNote, ReviewFeedback } from '../../components/recon/FeedbackNotes';
import type { CubeStateReader } from './algReview';
import { reviewRedundantMoves, type RedundancyReview } from './redundantMoves';

export interface AUFReview extends ReviewFeedback {
  redundancy: RedundancyReview;
}

const LL_STEPS = ['eo', 'co', 'ep', 'cp'];

const AUF_MOVES = ['U', 'U2', "U'"];

export const WRONG_AUF_NOTE: FeedbackNote = { category: 'bad', text: 'Wrong AUF' };

const isCubeSolved = (reader: CubeStateReader, moves: readonly string[]) =>
  reader.readSteps(moves).some(step => step.type === 'solved');

export const isOneAUFAway = (reader: CubeStateReader, moves: readonly string[]) =>
  AUF_MOVES.some(auf => isCubeSolved(reader, [...moves, auf]));

export function isLastLayerDone(reader: CubeStateReader, moves: readonly string[]): boolean {
  const steps = reader.readSteps(moves);
  if (steps.some(step => step.type === 'solved')) return true;
  const llSteps = new Set(steps.filter(step => step.type === 'last layer').map(step => step.step));
  return LL_STEPS.every(step => llSteps.has(step));
}

export function reviewAUF(movesAfter: readonly string[], lineMoves: readonly string[], isFinalStep: boolean, reader: CubeStateReader): AUFReview {
  const redundancy = reviewRedundantMoves(lineMoves);
  const notes = [...redundancy.notes];

  if (isFinalStep && !isCubeSolved(reader, movesAfter)) notes.push(WRONG_AUF_NOTE);

  const category = notes.length > 0 ? 'bad' : 'great';
  return { category, notes, redundancy };
}
