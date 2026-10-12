import type { F2LReview } from '../../composables/recon/f2lReview';
import FeedbackNotes from './FeedbackNotes';

export default function F2LReviewFeedback({ review }: { review: F2LReview }) {
  if (review.notes.length === 0) return <p>F2L advice failed to be generated.</p>;
  return <FeedbackNotes notes={review.notes} />;
}
