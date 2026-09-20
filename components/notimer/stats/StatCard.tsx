'use client';

import React from 'react';

export default function StatCard({
  title,
  controls,
  children,
  fills = false,
}: {
  title: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
  fills?: boolean;
}): React.ReactElement {
  return (
    <section className={`flex min-h-0 flex-col gap-1.5 ${fills ? 'flex-1' : ''}`}>
      <div className="-mx-3 flex shrink-0 items-center gap-2 border-b border-neutral-800 px-3 pb-1">
        <h2 className="min-w-0 grow truncate text-xs font-medium text-dark_accent select-none">
          {title}
        </h2>
        {controls}
      </div>
      {children}
    </section>
  );
}
