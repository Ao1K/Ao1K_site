import { useSyncedSettings } from '../../composables/useSettings';
import { crossStepInfo } from '../../composables/recon/crossAutocomplete';
import type { CrossPickCategory, CrossReview, ReviewedCross } from '../../composables/recon/crossReview';
import { ContinuationIcon, CrossIcon } from './SuggestionCard';
import FeedbackNotes from './FeedbackNotes';
import { CopyAlgButton, PlayAlgButton, type PlaybackControls } from './ReviewAlgButtons';
import DropdownIcon from '../icons/dropdown';

const CATEGORY_LABELS: Record<CrossPickCategory, string> = {
  fastest: 'Best',
  fewestMoves: 'FM',
  easiestContinuation: 'Ease',
};

const CATEGORY_MEANINGS: Record<CrossPickCategory, string> = {
  fastest: 'Fastest cross+1',
  fewestMoves: 'Fewest moves',
  easiestContinuation: 'Easier to find cross+1',
};

interface CrossPanelProps extends PlaybackControls {
  cross: ReviewedCross;
  categories?: CrossPickCategory[];
}

function CrossPanel({ cross, categories = [], ...playback }: CrossPanelProps) {
  const { settings: { cubeColors } } = useSyncedSettings();
  const { solution, shownMoves } = cross;
  const alg = shownMoves.join(' ');
  const isShown = playback.playingAlg === alg;

  return (
    <li>
      {(cross.isUserCross || categories.length > 0) && (
        <div className="flex flex-row gap-2 text-sm font-medium">
          {cross.isUserCross && <span className="rounded-t-sm bg-primary-400 px-1.5 text-dark">Your Solution</span>}
          {categories.length > 0 && (
            <span className="text-dark_accent">{categories.map(category => CATEGORY_LABELS[category]).join(' && ')}</span>
          )}
        </div>
      )}
      <details className={`group rounded-sm border bg-primary-900 px-2 py-1 ${cross.isUserCross ? 'rounded-tl-none' : ''} ${isShown ? 'border-primary-100' : 'border-neutral-600'}`}>
        <summary className="flex flex-col gap-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-neutral-500 group-hover:text-neutral-200 group-has-[button:hover]:text-neutral-500 transition-colors">
          <div className="flex flex-row items-center gap-2">
            <CrossIcon stepInfo={crossStepInfo(solution)} cubeColors={cubeColors} />
            <span className="grow ff-space-adjust text-primary-100">{shownMoves.join(' ')}</span>
            <ContinuationIcon cross={solution} cubeColors={cubeColors} />
            <CopyAlgButton alg={alg} noun="cross" />
            <PlayAlgButton alg={alg} noun="cross" {...playback} />
            <DropdownIcon className="shrink-0 text-lg transition-transform duration-300 rotate-180 group-open:rotate-0" />
          </div>
        </summary>
        <div className="mt-1 flex w-0 min-w-full flex-col gap-1 text-xs">
          {categories.length > 0 && (
            <ul className="list-disc pl-4">
              {categories.map(category => <li key={category}>{CATEGORY_MEANINGS[category]}</li>)}
            </ul>
          )}
          {solution.continuation && (
            <p>
              <span className="whitespace-nowrap">Next pair ({solution.category}):</span>{' '}
              <span className="inline-block ff-space-adjust text-primary-100">{solution.continuation}</span>
            </p>
          )}
        </div>
      </details>
    </li>
  );
}

export const cardGridClass = 'grid items-start gap-2 grid-cols-[repeat(1,1fr)] @xl:grid-cols-[repeat(2,1fr)] @5xl:grid-cols-[repeat(3,1fr)] pr-4 [scrollbar-gutter:stable]';

export const closedButSizedClass = [
  '[&:not([open])::details-content]:[content-visibility:visible]',
  '[&:not([open])::details-content]:h-0',
  '[&:not([open])::details-content]:overflow-hidden',
  '[&:not([open])::details-content]:invisible',
].join(' ');

export default function CrossReviewFeedback({ review, ...playback }: { review: CrossReview } & PlaybackControls) {
  return (
    <div className="@container flex flex-col gap-2">
      <FeedbackNotes notes={review.notes} />
      <div className="inline-grid w-fit gap-2">
        <ul className={`${cardGridClass} overflow-y-hidden`}>
          {review.picks.map(({ categories, cross }) => (
            <CrossPanel key={cross.shownMoves.join(' ')} cross={cross} categories={categories} {...playback} />
          ))}
        </ul>
        {review.others.length > 0 && (
          <details className={closedButSizedClass}>
            <summary className="cursor-pointer text-neutral-400">+{review.others.length} alternative{review.others.length === 1 ? '' : 's'}</summary>
            <ul className={`mt-2 ${cardGridClass} overflow-y-auto max-h-100`}>
              {review.others.map(cross => <CrossPanel key={cross.shownMoves.join(' ')} cross={cross} {...playback} />)}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
