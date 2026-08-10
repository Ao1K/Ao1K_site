'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import F2lSearch from './f2lSearch';
import { type FaceKey } from '../../composables/algs/cubePaint';
import { type F2lCaseConfig } from '../../composables/algs/f2lCaseId';
import type { Suggestion } from '../../composables/recon/SimpleCubeInterpreter';

export type AlgsetId = 'f2l';

interface AlgsetSelectorProps {
  cross: FaceKey;
  setCross: Dispatch<SetStateAction<FaceKey>>;
  pair: [FaceKey, FaceKey];
  setPair: Dispatch<SetStateAction<[FaceKey, FaceKey]>>;
  config: F2lCaseConfig;
  setConfig: Dispatch<SetStateAction<F2lCaseConfig>>;
  suggestions: Suggestion[];
  ready: boolean;
  initialAlgset: AlgsetId | null;
}

const ALGSETS: { id: AlgsetId; label: string }[] = [
  { id: 'f2l', label: 'F2L' },
];

function writeAlgsetURL(id: AlgsetId | null) {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set('a', id);
  else params.delete('a');
  const qs = params.toString();
  window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

const AlgsetSelector = ({ initialAlgset, ...props }: AlgsetSelectorProps) => {
  const [active, setActive] = useState<AlgsetId | null>(initialAlgset);
  const [settled, setSettled] = useState(initialAlgset != null);

  const toggle = (id: AlgsetId) => {
    const next = active === id ? null : id;
    setSettled(false);
    setActive(next);
    writeAlgsetURL(next);
  };

  return (
    <div className="flex w-full max-w-220 flex-col gap-1">
      <span className="text-xl text-dark_accent font-medium">Find Algs</span>
      <div className="flex flex-row flex-wrap gap-4 border border-neutral-600 p-4 mb-3 rounded-sm">
        {ALGSETS.map(({ id, label }) => {
          const open = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-expanded={open}
              className={`flex items-center bg-dark gap-2 rounded-sm border px-6 py-4 text-2xl font-medium transition-colors ${
                open
                  ? 'border-neutral-500 text-primary-100 hover:border-neutral-600'
                  : 'border-neutral-600 text-primary-100 hover:border-neutral-500'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* grid accordion — animating grid-template-rows avoids a layout reflow */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: active === 'f2l' ? '1fr' : '0fr',
          transition: 'grid-template-rows 300ms ease',
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'grid-template-rows' && active === 'f2l') setSettled(true);
        }}
      >
        <div style={{ overflow: settled ? 'visible' : 'hidden', minHeight: 0 }}>
          <div style={{ transition: 'opacity 250ms ease', opacity: active === 'f2l' ? 1 : 0 }}>
            <F2lSearch {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlgsetSelector;
