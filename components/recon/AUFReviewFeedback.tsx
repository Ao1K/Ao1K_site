import type { AUFReview } from '../../composables/recon/aufReview';
import FeedbackNotes from './FeedbackNotes';
import { RedundantMoves } from './AlgReviewFeedback';

export default function AUFReviewFeedback({ review }: { review: AUFReview }) {
  return (
    <div className="flex flex-col gap-2">
      <RedundantMoves moveGroups={review.redundancy.moveGroups} />
      <FeedbackNotes notes={review.notes} />
    </div>
  );
}
