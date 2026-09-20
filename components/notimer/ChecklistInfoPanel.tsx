'use client';

import React, { useState } from 'react';
import AngleDown from '../icons/angleDown';
import InfoIcon from '../icons/info';

const INFO_PANEL_KEY = 'ao1k.checklistInfoPanelOpen';

const readInfoPanelOpen = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(INFO_PANEL_KEY) !== 'false';
  } catch {
    return true;
  }
};

const writeInfoPanelOpen = (open: boolean) => {
  try {
    window.localStorage.setItem(INFO_PANEL_KEY, String(open));
  } catch {
    return;
  }
};

export default function ChecklistInfoPanel(): React.ReactElement {
  const [open, setOpen] = useState(readInfoPanelOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    writeInfoPanelOpen(next);
  };

  const paragraphs = (
    <div className="flex flex-col gap-2 border-t border-neutral-700 px-3 py-2 text-xs text-neutral-400">
      <p>
        Editing a list item keeps all the data associated with the old version. To track something new, add an
        item instead.
      </p>
      <p>
        Hiding an item keeps every answer already recorded against it. It just stops being asked.
        Deleting a hidden item erases those answers for good.
      </p>
    </div>
  );

  return (
    <div className="shrink-0 border-t border-neutral-600">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:text-primary-100 pointer-coarse:min-h-11"
      >
        <InfoIcon aria-hidden className="h-4 w-4 shrink-0" />
        Info
        <AngleDown
          aria-hidden
          className={`ml-auto h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && paragraphs}
    </div>
  );
}
