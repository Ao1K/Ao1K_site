import type { F2LReview } from '../../composables/recon/f2lReview';
import FeedbackNotes from './FeedbackNotes';

export default function F2LReviewFeedback({ review }: { review: F2LReview }) {
  return <FeedbackNotes notes={review.notes} />;
}
