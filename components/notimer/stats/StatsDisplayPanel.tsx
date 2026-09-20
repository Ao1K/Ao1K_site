'use client';

import React from 'react';

import { useStatsLayout, type SidebarSide } from '../../../composables/notimer/statsLayout';
import EyeIcon from '../../icons/eye';
import EyeSlashIcon from '../../icons/eyeSlash';
import { coarseTouchTarget } from '../checklistConstants';
import { STAT_ELEMENTS, placementFor } from './statElements';

const SIDES: { side: SidebarSide; label: string }[] = [
  { side: 'left', label: 'L' },
  { side: 'right', label: 'R' },
];

function SideToggle({
  value,
  label,
  onChange,
}: {
  value: SidebarSide;
  label: string;
  onChange: (side: SidebarSide) => void;
}) {
  return (
    <span
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center overflow-hidden rounded-sm border border-neutral-600 bg-dark text-xs"
    >
      {SIDES.map(({ side, label: sideLabel }) => (
        <button
          key={side}
          type="button"
          onClick={() => onChange(side)}
          aria-pressed={value === side}
          title={side === 'left' ? 'Left sidebar' : 'Right sidebar'}
          className={`px-2 py-1 transition-colors ${coarseTouchTarget} ${
            value === side
              ? 'bg-neutral-700 text-primary-100'
              : 'text-neutral-400 hover:text-primary-100'
          }`}
        >
          {sideLabel}
        </button>
      ))}
    </span>
  );
}

export default function StatsDisplayPanel({
  showSides,
}: {
  showSides: boolean;
}): React.ReactElement {
  const { settings, setVisible, setSide } = useStatsLayout();

  return (
    <ul className="flex flex-col gap-1">
      {STAT_ELEMENTS.map((element) => {
        const placement = placementFor(settings.placements, element);
        const Visibility = placement.visible ? EyeIcon : EyeSlashIcon;

        return (
          <li key={element.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisible(element.id, !placement.visible)}
              aria-pressed={placement.visible}
              title={placement.visible ? 'Hide' : 'Show'}
              className={`flex shrink-0 items-center justify-center rounded-sm border border-neutral-600 bg-dark px-1.5 py-1 transition-colors ${coarseTouchTarget} ${
                placement.visible
                  ? 'text-primary-100 hover:border-neutral-500'
                  : 'text-neutral-600 hover:border-neutral-500 hover:text-neutral-400'
              }`}
            >
              <Visibility aria-hidden className="h-4 w-4" />
            </button>

            <span
              className={`grow text-xs select-none ${
                placement.visible ? 'text-primary-200' : 'text-neutral-500'
              }`}
            >
              {element.title}
            </span>

            {showSides && (
              <SideToggle
                value={placement.side}
                label={`${element.title} sidebar`}
                onChange={(side) => setSide(element.id, side)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
