'use client';

import React from 'react';

interface IconButtonProps {
  label: string;
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

export default function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: IconButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center justify-center rounded-sm border bg-dark px-1.5 py-1 transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${
        disabled
          ? 'cursor-default border-neutral-700 text-neutral-600'
          : `cursor-pointer border-neutral-600 text-neutral-400 hover:border-neutral-500 ${
              danger ? 'hover:text-red-500' : 'hover:text-primary-100'
            }`
      }`}
    >
      {children}
    </button>
  );
}
