'use client';

import React, { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Prompt } from '../../composables/notimer/db';
import { listHiddenPrompts } from '../../composables/notimer/dbUtils';
import CloseIcon from '../icons/close';
import ChecklistInfoPanel from './ChecklistInfoPanel';
import ChecklistSection from './ChecklistSection';
import IconButton from './IconButton';
import { SECTIONS, coarseTouchTarget } from './checklistConstants';

interface ChecklistEditorProps {
  prompts: Prompt[];
  onClose: () => void;
}

const NO_PROMPTS: Prompt[] = [];

export default function ChecklistEditor({ prompts, onClose }: ChecklistEditorProps): React.ReactElement {
  const hiddenPrompts = useLiveQuery(() => listHiddenPrompts(), [], NO_PROMPTS);

  const [confirmingId, setConfirmingId] = useState<number | null>(null);

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
    <div className="flex shrink-0 items-center gap-3 border-b justify-between border-neutral-700 bg-primary-400 px-3 py-2">
      <span className="text-lg font-semibold text-dark">Checklist</span>
      <button
        type="button"
        onClick={onClose}
        className={`rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-300 bg-primary-900 hover:bg-primary-800 transition-colors hover:text-primary-100 ${coarseTouchTarget}`}
      >
        Close
      </button>
    </div>
  );

  const sections = SECTIONS.map(({ phase, title, empty, placeholder }) => (
    <ChecklistSection
      key={phase}
      phase={phase}
      title={title}
      empty={empty}
      placeholder={placeholder}
      prompts={prompts.filter((prompt) => prompt.phase === phase)}
      hiddenPrompts={hiddenPrompts.filter((prompt) => prompt.phase === phase)}
      confirmingId={confirmingId}
      onConfirmingIdChange={setConfirmingId}
    />
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
        aria-label="Checklist editor"
        className="flex max-h-[85vh] w-full max-w-160 flex-col rounded-sm border border-neutral-600 bg-dark text-primary-100 outline-none"
      >
        {header}

        <div className="flex-1 overflow-y-auto px-2 py-2">{sections}</div>

        <ChecklistInfoPanel />
      </div>
    </div>
  );
}
