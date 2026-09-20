'use client';

import React, { useCallback } from 'react';
import { coarseTouchTarget } from './checklistConstants';

interface KeyboardShortcutsDialogProps {
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  meaning: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Moving Around',
    shortcuts: [
      { keys: ['Space'], meaning: 'Next item, and clear any existing answer' },
      { keys: ['Tab', '↓', 'Enter'], meaning: 'Next item' },
      { keys: ['Shift + Tab', '↑'], meaning: 'Previous item' },
      { keys: ['Esc'], meaning: 'Go to the scramble item' },
      { keys: ['Ctrl + ↓'], meaning: 'Skip to the next solve, even with items left blank' },
      { keys: ['Ctrl + ↑'], meaning: 'Go back to the previous solve' },
    ],
  },
  {
    title: 'Timing',
    shortcuts: [
      { keys: ['Space'], meaning: 'Press and hold to activate the timer, release to start' },
      { keys: ['Esc'], meaning: "Cancel the running timer and don't update time" },
      { keys: ['Any other key'], meaning: 'Stop the running timer and record new time' },
    ],
  },
  {
    title: 'Yes / No Items',
    shortcuts: [
      { keys: ['y', '1'], meaning: 'Yes' },
      { keys: ['n', '0'], meaning: 'No' },
      { keys: ['Space', 'Enter'], meaning: 'Leave blank and move on' },
    ],
  },
  {
    title: 'Number Items',
    shortcuts: [
      { keys: ['0–9', '.'], meaning: 'Type the value' },
      { keys: ['Space', 'Enter'], meaning: 'Save and move on' },
    ],
  },
];

export default function KeyboardShortcutsDialog({
  onClose,
}: KeyboardShortcutsDialogProps): React.ReactElement {
  const focusOnMount = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onClose();
  };

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-700 bg-primary-400 px-3 py-2">
      <span className="text-lg font-semibold text-dark">Keyboard shortcuts</span>
      <button
        type="button"
        onClick={onClose}
        className={`rounded border border-neutral-600 bg-primary-900 px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-primary-800 hover:text-primary-100 ${coarseTouchTarget}`}
      >
        Close
      </button>
    </div>
  );

  const groups = GROUPS.map((group) => (
    <section key={group.title} className="px-3 py-2">
      <h3 className="pb-1 text-xs font-semibold tracking-wide text-dark_accent">
        {group.title}
      </h3>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {group.shortcuts.map((shortcut) => (
            <tr key={`${group.title}:${shortcut.meaning}`} className="align-top">
              <td className="w-40 py-1 pr-3">
                <span className="flex flex-row flex-wrap items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className="rounded-sm border border-neutral-600 bg-primary-900 px-1.5 py-0.5 font-sans text-xs whitespace-nowrap text-primary-100"
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
              </td>
              <td className="py-1 text-neutral-400">{shortcut.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={onClose}
    >
      <div
        ref={focusOnMount}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="flex max-h-[85vh] w-full max-w-160 flex-col rounded-sm border border-neutral-600 bg-dark text-primary-100 outline-none"
      >
        {header}

        <div className="flex-1 divide-y divide-neutral-800 overflow-y-auto py-1">{groups}</div>
      </div>
    </div>
  );
}
