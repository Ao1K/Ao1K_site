'use client';

import React, { useState } from 'react';

import CaretIcon from '../../icons/dropdown';

export interface StatSelectOption {
  value: number;
  label: string;
}

export default function StatSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: StatSelectOption[];
  onChange: (value: number) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const choose = (option: number) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="relative flex shrink-0 items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((previous) => !previous)}
        className="flex cursor-pointer items-center gap-1 rounded-sm border border-neutral-600 bg-dark py-0.5 pr-1 pl-1.5 text-xs text-primary-100 transition-colors hover:border-neutral-500"
      >
        {selected?.label ?? value}
        <CaretIcon className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-20" onMouseDown={() => setOpen(false)} />
      )}

      {open && (
        <ul
          role="listbox"
          className="absolute top-full right-0 z-30 min-w-full rounded-sm border border-neutral-600 bg-dark shadow-lg shadow-black/50"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                tabIndex={-1}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option.value)}
                className={`block w-full px-3 py-1 text-right text-xs transition-colors hover:bg-neutral-700 ${
                  option.value === value ? 'text-primary-300' : 'text-primary-100'
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
