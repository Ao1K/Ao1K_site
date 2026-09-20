'use client';

import React, { useState } from 'react';
import type { Prompt } from '../../composables/notimer/db';
import { hidePrompt, updatePromptKind, updatePromptPhase, updatePromptText } from '../../composables/notimer/dbUtils';
import EyeSlashIcon from '../icons/eyeSlash';
import GripIcon from '../icons/grip';
import IconButton from './IconButton';
import KindToggle from './KindToggle';
import { OTHER_PHASE, coarseTouchTarget, promptGlyph, textInputClass } from './checklistConstants';

interface ChecklistPromptRowProps {
  prompt: Prompt;
  dragOffset: number | null;
  onDragStart: (event: React.PointerEvent) => void;
  onKeyboardMove: (offset: -1 | 1) => void;
}

export default function ChecklistPromptRow({
  prompt,
  dragOffset,
  onDragStart,
  onKeyboardMove,
}: ChecklistPromptRowProps): React.ReactElement {
  const [draft, setDraft] = useState<string | null>(null);

  const dragging = dragOffset !== null;
  const otherPhase = OTHER_PHASE[prompt.phase];

  const commitText = () => {
    if (draft === null) return;
    const trimmed = draft.trim();
    if (trimmed === '' || trimmed === prompt.text) {
      setDraft(null);
      return;
    }
    updatePromptText(prompt.id, trimmed);
  };

  const handleGripPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    onDragStart(event);
  };

  const handleGripKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    onKeyboardMove(event.key === 'ArrowUp' ? -1 : 1);
  };

  const grip = (
    <button
      type="button"
      aria-label={`Reorder ${prompt.text}, or press the up and down arrow keys`}
      title="Drag to reorder"
      onPointerDown={handleGripPointerDown}
      onKeyDown={handleGripKeyDown}
      className={`flex h-7 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-neutral-500 transition-colors hover:text-primary-100 focus-visible:text-primary-100 active:cursor-grabbing pointer-coarse:w-11 ${
        dragging ? 'text-primary-100' : ''
      } ${coarseTouchTarget}`}
    >
      <GripIcon className="h-4 w-4 pointer-coarse:h-6 pointer-coarse:w-6" />
    </button>
  );

  const actions = (
    <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
      <button
        type="button"
        onClick={() => updatePromptPhase(prompt.id, otherPhase)}
        title={`Ask this ${otherPhase === 'pre' ? 'before' : 'after'} the solve instead`}
        className={`cursor-pointer rounded-sm border border-neutral-600 bg-dark px-1.5 py-1 text-xs whitespace-nowrap text-neutral-400 transition-colors hover:border-neutral-500 hover:text-primary-100 pointer-coarse:px-3 ${coarseTouchTarget}`}
      >
        {otherPhase === 'pre' ? '🡐' : '🡒'} {otherPhase}
      </button>
      <IconButton label="Hide item" onClick={() => hidePrompt(prompt.id)}>
        <EyeSlashIcon className="h-4 w-4" />
      </IconButton>
    </span>
  );

  return (
    <li
      style={dragging ? { transform: `translateY(${dragOffset}px)` } : undefined}
      className={`group flex flex-row flex-wrap items-center gap-2 px-2 py-1 ${
        dragging ? 'relative z-10 bg-neutral-700 shadow-lg' : 'transition-colors hover:bg-neutral-700/40'
      }`}
    >
      {grip}

      <span aria-hidden className="w-6 shrink-0 text-center text-base text-dark_accent select-none">
        {promptGlyph(prompt.id)}
      </span>

      <input
        type="text"
        value={draft ?? prompt.text}
        aria-label="Checklist item text"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitText}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        className={textInputClass}
      />

      <KindToggle
        value={prompt.kind}
        label="Answer type"
        onChange={(kind) => updatePromptKind(prompt.id, kind)}
      />

      {actions}
    </li>
  );
}
