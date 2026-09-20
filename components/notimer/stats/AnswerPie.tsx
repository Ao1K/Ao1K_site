'use client';

import React from 'react';

export interface AnswerTally {
  yes: number;
  no: number;
  none: number;
}

const CENTER = 16;
const RADIUS = 15;
const FULL_TURN = Math.PI * 2;

const SLICES: { key: keyof AnswerTally; label: string; colorClass: string }[] = [
  { key: 'yes', label: 'Yes', colorClass: 'text-green-300' },
  { key: 'no', label: 'No', colorClass: 'text-orange-300' },
  { key: 'none', label: 'Unanswered', colorClass: 'text-neutral-700' },
];

function edgePoint(angle: number): string {
  const x = CENTER + RADIUS * Math.sin(angle);
  const y = CENTER - RADIUS * Math.cos(angle);
  return `${x.toFixed(3)} ${y.toFixed(3)}`;
}

function slicePath(startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${edgePoint(startAngle)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${edgePoint(endAngle)} Z`;
}

function shareText(tally: AnswerTally, total: number): string {
  return SLICES.map(({ key, label }) => `${label} ${Math.round((tally[key] / total) * 100)}%`).join(
    ' · ',
  );
}

export default function AnswerPie({
  tally,
  label,
  className = '',
}: {
  tally: AnswerTally;
  label: string;
  className?: string;
}): React.ReactElement {
  const total = tally.yes + tally.no + tally.none;
  const description = `${label} — ${total === 0 ? 'no answers' : shareText(tally, total)}`;

  let sweptSoFar = 0;

  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={description} className={className}>
      <title>{description}</title>

      {total === 0 && (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS - 0.5}
          fill="none"
          stroke="currentColor"
          className="text-neutral-700"
        />
      )}

      {total > 0 &&
        SLICES.map(({ key, colorClass }) => {
          const fraction = tally[key] / total;
          const startAngle = sweptSoFar;
          sweptSoFar += fraction * FULL_TURN;

          if (fraction === 0) return null;
          if (fraction === 1) {
            return (
              <circle
                key={key}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="currentColor"
                className={colorClass}
              />
            );
          }
          return (
            <path
              key={key}
              d={slicePath(startAngle, sweptSoFar)}
              fill="currentColor"
              className={colorClass}
            />
          );
        })}
    </svg>
  );
}
