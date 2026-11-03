import { Fragment } from 'react';
import type { AlgReview, ReviewedAlg } from '../../composables/recon/algReview';
import type { MoveGroup, RedundancyCategory } from '../../composables/recon/redundantMoves';
import { cube3x3 } from '../../utils/parser/cube3x3';
import FeedbackNotes from './FeedbackNotes';
import { CopyAlgButton, FavoriteAlgButton, PlayAlgButton, type PlaybackControls } from './ReviewAlgButtons';
import { cardGridClass, closedButSizedClass } from './CrossReviewFeedback';

const SHOWN_ALG_COUNT = 4;

const REDUNDANCY_COLOR_CLASSES: Record<RedundancyCategory, string> = {
  none: '',
  exception: '',
  combine: 'text-cube-orange',
  cancel: 'text-cube-red',
};

function AlgPanel({ reviewedAlg: { moves, algset }, ...playback }: { reviewedAlg: ReviewedAlg } & PlaybackControls) {
  const alg = cube3x3.format(moves);
  const isShown = playback.playingAlg === alg;

  return (
    <li>
      <div className={`flex flex-row items-center gap-2 rounded-sm border bg-primary-900 px-2 py-1 ${isShown ? 'border-primary-100' : 'border-neutral-600'}`}>
        <span className="grow ff-space-adjust text-primary-100">{alg}</span>
        <FavoriteAlgButton moves={moves} algset={algset} />
        <CopyAlgButton moves={moves} noun="alg" />
        <PlayAlgButton moves={moves} noun="alg" {...playback} />
      </div>
    </li>
  );
}

export function RedundantMoves({ moveGroups }: { moveGroups: readonly MoveGroup[] }) {
  const hasExtraMoves = moveGroups.some(({ category }) => category === 'combine' || category === 'cancel');
  if (!hasExtraMoves) return null;

  return (
    <p className="ff-space-adjust text-base text-primary-100">
      {moveGroups.map(({ moves, category }, index) => (
        <Fragment key={index}>
          {index > 0 && ' '}
          <span className={REDUNDANCY_COLOR_CLASSES[category]}>{cube3x3.format(moves)}</span>
        </Fragment>
      ))}
    </p>
  );
}

export default function AlgReviewFeedback({ review, ...playback }: { review: AlgReview } & PlaybackControls) {
  const shownAlgs = review.suggestions.slice(0, SHOWN_ALG_COUNT);
  const otherAlgs = review.suggestions.slice(SHOWN_ALG_COUNT);

  return (
    <div className="@container flex flex-col gap-2">
      <RedundantMoves moveGroups={review.redundancy.moveGroups} />
      <FeedbackNotes notes={review.notes} />
      {shownAlgs.length > 0 && (
        <div className="inline-grid w-fit gap-2">
          <ul className={`${cardGridClass} overflow-y-hidden`}>
            {shownAlgs.map(reviewedAlg => <AlgPanel key={cube3x3.format(reviewedAlg.moves)} reviewedAlg={reviewedAlg} {...playback} />)}
          </ul>
          {otherAlgs.length > 0 && (
            <details className={closedButSizedClass}>
              <summary className="cursor-pointer text-neutral-400">+{otherAlgs.length} alternative{otherAlgs.length === 1 ? '' : 's'}</summary>
              <ul className={`mt-2 ${cardGridClass} overflow-y-auto max-h-100`}>
                {otherAlgs.map(reviewedAlg => <AlgPanel key={cube3x3.format(reviewedAlg.moves)} reviewedAlg={reviewedAlg} {...playback} />)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
