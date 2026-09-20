'use client';

import React from 'react';

import type { StatElementDefinition } from './statElements';

export default function StatsSidebar({
  elements,
  cursorIndex,
  label,
  className = '',
}: {
  elements: StatElementDefinition[];
  cursorIndex: number;
  label: string;
  className?: string;
}): React.ReactElement {
  return (
    <aside
      aria-label={label}
      className={`absolute inset-y-0 z-10 flex w-56 flex-col gap-4 overflow-hidden bg-primary-900 px-3 py-4 ${className}`}
    >
      {elements.map(({ id, title, Component }) => (
        <Component key={id} title={title} cursorIndex={cursorIndex} />
      ))}
    </aside>
  );
}
