'use client';

import React from 'react';
import type { PromptKind } from '../../composables/notimer/db';
import { KIND_LABEL, KINDS } from './checklistConstants';

interface KindToggleProps {
  value: PromptKind;
  label: string;
  onChange: (kind: PromptKind) => void;
}

export default function KindToggle({ value, label, onChange }: KindToggleProps): React.ReactElement {
  return (
    <span
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center overflow-hidden rounded-sm border border-neutral-600 bg-dark text-xs"
    >
      {KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => onChange(kind)}
          aria-pressed={value === kind}
          className={`px-1.5 py-1 whitespace-nowrap transition-colors pointer-coarse:min-h-11 pointer-coarse:px-3 ${
            value === kind ? 'bg-neutral-700 text-primary-100' : 'text-neutral-400 hover:text-primary-100'
          }`}
        >
          {KIND_LABEL[kind]}
        </button>
      ))}
    </span>
  );
}
