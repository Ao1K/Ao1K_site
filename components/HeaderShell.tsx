'use client';

import React from 'react';

import { useHeaderHidden } from '../composables/useHeaderAutoHide';

export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const hidden = useHeaderHidden();

  return (
    <div
      className={`absolute bg-primary-200 flex flex-row text-light_accent w-full z-45 h-16 top-0 transition-transform duration-200 ${
        hidden ? 'max-sm:-translate-y-full' : ''
      }`}
    >
      {children}
    </div>
  );
}
