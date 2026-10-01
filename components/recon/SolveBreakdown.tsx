'use client';
import { Fragment, useCallback, useState } from 'react';
import { ICON_SIZE_CONFIG } from '../../composables/useSettings';
import { StepIconSvg } from './IconStack';
import CrossReviewFeedback, { CrossFeedbackLabel } from './CrossReviewFeedback';
import type { CrossReview } from '../../composables/recon/crossReview';
import { colorDict } from '../../utils/sharedConstants';
import {
  FLIGHT_BOX_CLASS,
  PAGE_TRANSITION_NAMES,
  flightStyle,
  iconTransitionName,
  lineTransitionName,
  type BreakdownLine,
  type BreakdownSession,
} from '../../composables/recon/breakdownTransition';

const { lineHeight, iconWidth } = ICON_SIZE_CONFIG.medium;

const stepLabel = (line: BreakdownLine) => {
  const info = line.iconDatum?.compiledStepInfo;
  if (!info || info.type === 'cross' || info.type === 'f2l') return null;
  if (info.name) return info.nameType ? `${info.nameType.toUpperCase()} ${info.name}` : info.name;
  return info.step;
};

export interface BreakdownPlayRequest {
  lineIndex: number;
  alg: string;
  isFinished?: boolean;
}

interface SolveBreakdownProps {
  session: BreakdownSession;
  crossReview: CrossReview | null;
  playingRequest: BreakdownPlayRequest | null;
  onPlay: (request: BreakdownPlayRequest) => void;
  onStop: () => void;
}

export default function SolveBreakdown({ session, crossReview, playingRequest, onPlay, onStop }: SolveBreakdownProps) {
  const { lines, viewTransition } = session;
  const [isFlightDone, setIsFlightDone] = useState(viewTransition === null);

  const waitForFlight = useCallback((root: HTMLOListElement | null) => {
    if (root) viewTransition?.finished.then(() => setIsFlightDone(true));
  }, [viewTransition]);

  const revealClass = `transition-opacity duration-500 ${isFlightDone ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div className="flex flex-col gap-6">
      <ol
        ref={waitForFlight}
        className={`flex flex-col gap-4 ${FLIGHT_BOX_CLASS}`}
        style={flightStyle(PAGE_TRANSITION_NAMES.solutionBox)}
      >
        {lines.map(line => {
          const descriptor = line.iconDatum?.isEmptyIcon ? null : line.iconDatum?.descriptor;
          const label = stepLabel(line);
          const stepInfo = line.iconDatum?.compiledStepInfo;
          const isUnknownStep = !stepInfo || stepInfo.step === 'unknown';
          const hasNonRotationMove = line.words.some(word => word.className === colorDict.move && !/^[xyz]/.test(word.text));
          return (
            <li key={line.index} className="grid gap-x-3" style={{ gridTemplateColumns: `${iconWidth}px minmax(0, 1fr)` }}>
              <div style={descriptor ? flightStyle(iconTransitionName(line.index)) : undefined}>
                {descriptor && <StepIconSvg descriptor={descriptor} nameType={line.iconDatum?.compiledStepInfo?.nameType} />}
              </div>
              <div className="flex flex-row items-start gap-3" style={{ lineHeight: `${lineHeight}px` }}>
                <div
                  className="min-w-0 ff-space-adjust text-[1.125rem] text-primary-100 wrap-break-word"
                  style={flightStyle(lineTransitionName(line.index))}
                >
                  {line.words.map((word, wordIndex) => (
                    <Fragment key={wordIndex}>
                      {word.spaceBefore && ' '}
                      <span className={word.className}>{word.text}</span>
                    </Fragment>
                  ))}
                </div>
                {crossReview?.lineIndex === line.index && (
                  <CrossFeedbackLabel category={crossReview.feedback.category} className={revealClass} />
                )}
                {isUnknownStep && hasNonRotationMove && (
                  <span className={`font-medium whitespace-nowrap text-primary-400 ${revealClass}`}>Unknown step</span>
                )}
              </div>
              {!isUnknownStep && <div className={`col-start-2 mt-1 px-3 py-2 rounded-sm border border-neutral-600 bg-primary-800 text-sm text-primary-200 ${revealClass}`}>
                {label && <div className="font-medium text-primary-100">{label}</div>}
                {crossReview?.lineIndex === line.index
                  ? <CrossReviewFeedback
                      review={crossReview}
                      playingAlg={playingRequest?.lineIndex === line.index ? playingRequest.alg : null}
                      isPlaybackFinished={playingRequest?.isFinished ?? false}
                      onPlay={alg => onPlay({ lineIndex: line.index, alg })}
                      onStop={onStop}
                    />
                  : <p>Advice for this line goes here.</p>}
              </div>}
            </li>
          );
        })}
      </ol>
      <section className={revealClass}>
        <h3 className="text-xl text-dark_accent font-medium">General Feedback</h3>
        <p className="text-primary-200">Feedback about the whole solve goes here.</p>
      </section>
    </div>
  );
}
