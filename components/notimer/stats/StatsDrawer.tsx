'use client';

import React, { useCallback, useState } from 'react';

import AngleDown from '../../icons/angleDown';
import SettingsIcon from '../../icons/settings';
import { coarseTouchTarget } from '../checklistConstants';
import StatsDisplayPanel from './StatsDisplayPanel';
import type { StatElementDefinition } from './statElements';

export default function StatsDrawer({
  elements,
  cursorIndex,
  onClose,
}: {
  elements: StatElementDefinition[];
  cursorIndex: number;
  onClose: () => void;
}): React.ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const focusOnMount = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex justify-end bg-black/60" onMouseDown={onClose}>
      <div
        ref={focusOnMount}
        tabIndex={-1}
        role="dialog"
        aria-label="Statistics"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-full w-72 max-w-[85vw] flex-col border-l border-neutral-600 bg-dark outline-none"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-neutral-700 px-3 py-2">
          <span className="grow text-sm font-semibold text-primary-100 select-none">Statistics</span>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-sm border border-neutral-600 bg-primary-900 px-2 py-1 text-xs text-neutral-300 transition-colors hover:bg-primary-800 hover:text-primary-100 ${coarseTouchTarget}`}
          >
            Close
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-3 py-3">
          {elements.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Everything is hidden. Turn something on in Display.
            </p>
          ) : (
            elements.map(({ id, title, Component }) => (
              <Component key={id} title={title} cursorIndex={cursorIndex} />
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-600">
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:text-primary-100 ${coarseTouchTarget}`}
          >
            <SettingsIcon aria-hidden className="h-4 w-4 shrink-0" />
            Display
            <AngleDown
              aria-hidden
              className={`ml-auto h-4 w-4 shrink-0 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {settingsOpen && (
            <div className="border-t border-neutral-700 px-3 py-2">
              <StatsDisplayPanel showSides={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
