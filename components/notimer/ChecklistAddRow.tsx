'use client';

import React, { useState } from 'react';
import type { PromptKind, PromptPhase } from '../../composables/notimer/db';
import { addPrompt } from '../../composables/notimer/dbUtils';
import AddIcon from '../icons/plus';
import KindToggle from './KindToggle';
import { textInputClass } from './checklistConstants';

interface ChecklistAddRowProps {
  phase: PromptPhase;
  placeholder: string;
}

export default function ChecklistAddRow({
  phase,
  placeholder,
}: ChecklistAddRowProps): React.ReactElement {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<PromptKind>('boolean');

  const trimmed = text.trim();
  const canAdd = trimmed !== '';

  const handleAdd = () => {
    if (!canAdd) return;
    addPrompt(trimmed, kind, phase);
    setText('');
  };

  return (
    <div className="flex flex-row flex-wrap items-center gap-2 px-2 py-1">
      <span aria-hidden className="w-6 shrink-0 pointer-coarse:w-11" />

      <span aria-hidden className="w-6 shrink-0 text-center text-neutral-400 select-none">
        <AddIcon className="mx-auto h-4 w-4" />
      </span>

      <input    
        type="text"
        value={text}
        placeholder={placeholder}
        aria-label={`New ${phase}-solve item`}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          handleAdd();
        }}
        className={`${textInputClass} placeholder:text-neutral-600`}
      />

      <KindToggle value={kind} label={`New ${phase}-solve item answer type`} onChange={setKind} />

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        className={`shrink-0 rounded-sm border px-2 py-1 text-xs whitespace-nowrap transition-colors pointer-coarse:min-h-11 pointer-coarse:px-4 ${
          canAdd
            ? 'cursor-pointer border-neutral-600 bg-dark text-primary-100 hover:border-neutral-500 hover:text-primary-300'
            : 'cursor-default border-neutral-700 text-neutral-600'
        }`}
      >
        Add
      </button>
    </div>
  );
}
