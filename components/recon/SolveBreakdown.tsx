'use client';
import { Fragment, useCallback, useState } from 'react';
import { ICON_SIZE_CONFIG } from '../../composables/useSettings';
import { StepIconSvg } from './IconStack';
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
  if (!info) return 'No step detected';
  if (info.name) return info.nameType ? `${info.nameType.toUpperCase()} ${info.name}` : info.name;
  return info.step;
};

export default function SolveBreakdown({ session }: { session: BreakdownSession }) {
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
          return (
            <li key={line.index} className="grid gap-x-3" style={{ gridTemplateColumns: `${iconWidth}px minmax(0, 1fr)` }}>
              <div style={descriptor ? flightStyle(iconTransitionName(line.index)) : undefined}>
                {descriptor && <StepIconSvg descriptor={descriptor} nameType={line.iconDatum?.compiledStepInfo?.nameType} />}
              </div>
              <div
                className="ff-space-adjust text-[1.125rem] text-primary-100 wrap-break-word"
                style={{ lineHeight: `${lineHeight}px`, ...flightStyle(lineTransitionName(line.index)) }}
              >
                {line.words.map((word, wordIndex) => (
                  <Fragment key={wordIndex}>
                    {word.spaceBefore && ' '}
                    <span className={word.className}>{word.text}</span>
                  </Fragment>
                ))}
              </div>
              <div className={`col-start-2 mt-1 px-3 py-2 rounded-sm border border-neutral-600 bg-primary-800 text-sm text-primary-200 ${revealClass}`}>
                <div className="font-medium text-primary-100">{stepLabel(line)}</div>
                <p>Advice for this line goes here.</p>
                <p className="text-dark_accent">Tutorial link placeholder</p>
              </div>
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
