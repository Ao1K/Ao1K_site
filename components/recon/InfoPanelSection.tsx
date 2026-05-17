'use client';

import { useState } from 'react';
import DropdownIcon from '../icons/dropdown';

export default function InfoPanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="py-2 text-xl mt-8 pl-2 w-full text-dark bg-primary-300 hover:bg-primary-200 transition flex flex-row items-center justify-between text-start pr-2 select-none"
        onClick={() => setOpen(o => !o)}
      >
        <span>{`>`} {title}</span>
        <DropdownIcon
          className="w-4 h-4 shrink-0"
          style={{ transition: 'transform 300ms ease', transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 300ms ease',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div
            className="space-y-4 pt-3"
            style={{ transition: 'opacity 250ms ease', opacity: open ? 1 : 0 }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
