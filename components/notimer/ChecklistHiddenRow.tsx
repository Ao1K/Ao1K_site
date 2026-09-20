'use client';

import React from 'react';
import type { Prompt } from '../../composables/notimer/db';
import { deletePrompt, showPrompt } from '../../composables/notimer/dbUtils';
import EyeIcon from '../icons/eye';
import TrashIcon from '../icons/trash';
import IconButton from './IconButton';
import { KIND_LABEL, coarseTouchTarget, promptGlyph } from './checklistConstants';

interface ChecklistHiddenRowProps {
  prompt: Prompt;
  confirming: boolean;
  onConfirmingChange: (confirming: boolean) => void;
}

export default function ChecklistHiddenRow({
  prompt,
  confirming,
  onConfirmingChange,
}: ChecklistHiddenRowProps): React.ReactElement {
  const handleDelete = () => {
    deletePrompt(prompt.id);
    onConfirmingChange(false);
  };

  const handleShow = () => {
    showPrompt(prompt.id);
    onConfirmingChange(false);
  };

  const confirmButtons = (
    <>
      <button
        type="button"
        onClick={handleDelete}
        className={`cursor-pointer rounded-sm border border-red-500 px-2 py-0.5 text-xs font-medium text-primary-200 transition-colors hover:bg-red-900 pointer-coarse:px-3 ${coarseTouchTarget}`}
      >
        Delete
      </button>
      <button
        type="button"
        onClick={() => onConfirmingChange(false)}
        className={`cursor-pointer rounded-sm border border-neutral-400 px-2 py-0.5 text-xs font-medium text-neutral-400 transition-colors duration-100 hover:bg-neutral-600 pointer-coarse:px-3 ${coarseTouchTarget}`}
      >
        Cancel
      </button>
    </>
  );

  const iconButtons = (
    <>
      <IconButton label="Show item" onClick={handleShow}>
        <EyeIcon className="h-4 w-4" />
      </IconButton>
      <IconButton
        label="Delete item and its answers (hold shift to skip confirmation)"
        danger
        onClick={(event) => (event.shiftKey ? handleDelete() : onConfirmingChange(true))}
      >
        <TrashIcon className="h-4 w-4" />
      </IconButton>
    </>
  );

  return (
    <li className="group flex flex-row flex-wrap items-center gap-2 px-2 py-1 transition-colors hover:bg-neutral-700/40">
      <span aria-hidden className="w-6 shrink-0 pointer-coarse:w-11" />

      <span aria-hidden className="w-6 shrink-0 text-center text-base text-neutral-600 select-none">
        {promptGlyph(prompt.id)}
      </span>

      <span className="min-w-32 flex-1 px-1.5 py-1 text-sm text-neutral-500">{prompt.text}</span>

      <span className="shrink-0 px-1.5 text-xs text-neutral-600">{KIND_LABEL[prompt.kind]}</span>

      <span
        className={`flex shrink-0 items-center gap-1 transition-opacity duration-200 ${
          confirming
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100'
        }`}
      >
        {confirming ? confirmButtons : iconButtons}
      </span>
    </li>
  );
}
