'use client';

import React, { useState } from 'react';

const DIGIT_COUNT = 10;
const STOPS_BEYOND_TRAVEL = 1;
const ROLL_TRANSITION =
  'transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

interface Roll {
  digit: number;
  offset: number;
  travelFrom: number;
}

function stepsBetween(from: number, to: number, ascending: boolean): number {
  const stepsUp = (to - from + DIGIT_COUNT) % DIGIT_COUNT;
  const stepsDown = stepsUp - DIGIT_COUNT;
  if (stepsUp === 0) return 0;
  return ascending ? stepsUp : stepsDown;
}

function digitAt(stop: number): number {
  return ((stop % DIGIT_COUNT) + DIGIT_COUNT) % DIGIT_COUNT;
}

function WidthSpacer() {
  return <span className="invisible">0</span>;
}

function DigitRoll({ digit, ascending }: { digit: number; ascending: boolean }) {
  const [roll, setRoll] = useState<Roll>(() => ({ digit, offset: digit, travelFrom: digit }));

  let current = roll;
  if (roll.digit !== digit) {
    current = {
      digit,
      offset: roll.offset + stepsBetween(roll.digit, digit, ascending),
      travelFrom: roll.offset,
    };
    setRoll(current);
  }

  const firstStop = Math.min(current.offset, current.travelFrom) - STOPS_BEYOND_TRAVEL;
  const lastStop = Math.max(current.offset, current.travelFrom) + STOPS_BEYOND_TRAVEL;
  const stops: number[] = [];
  for (let stop = firstStop; stop <= lastStop; stop += 1) stops.push(stop);

  return (
    <span className="relative inline-flex overflow-hidden">
      <WidthSpacer />
      <span
        className={`absolute inset-0 ${ROLL_TRANSITION}`}
        style={{ transform: `translateY(${-current.offset * 100}%)` }}
      >
        {stops.map((stop) => (
          <span
            key={stop}
            className="absolute inset-x-0 h-full text-center"
            style={{ top: `${stop * 100}%` }}
          >
            {digitAt(stop)}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function RollingNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}): React.ReactElement {
  const [change, setChange] = useState(() => ({ value, previous: value }));

  let current = change;
  if (change.value !== value) {
    current = { value, previous: change.value };
    setChange(current);
  }

  const ascending = current.value >= current.previous;
  const characters = String(current.value).split('');

  return (
    <span className={`inline-flex tabular-nums ${className ?? ''}`}>
      <span className="sr-only">{current.value}</span>
      <span aria-hidden className="inline-flex">
        {characters.map((character, index) => {
          if (character < '0' || character > '9') {
            return <span key={`mark${index}`}>{character}</span>;
          }
          const placeFromRight = characters.length - 1 - index;
          return <DigitRoll key={placeFromRight} digit={Number(character)} ascending={ascending} />;
        })}
      </span>
    </span>
  );
}
