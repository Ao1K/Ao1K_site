'use client';

// A single saved alg in the "Your Algs" list. Clicking the card toggles its status between
// learning (light yellow) and memorized (light green). An inline trash → confirm flow deletes
// it without a modal. The step icon is chosen from the alg's detected algset (F2L pair, OLL/PLL
// grid, or a text box); clicking the icon lets the user override the algset label.

import { useMemo, useState } from 'react';
import type { AlgStatus } from '../../composables/algs/algFavorites';
import { classifyAlg, classifyFavorite } from '../../composables/algs/classifyAlg';
import { useCubeColors } from '../../composables/useSettings';
import AlgIcon from './AlgIcon';
import CloseIcon from '../icons/close';

interface YourAlgCardProps {
  alg: string;
  status: AlgStatus;
  algset?: string;
  onToggleStatus: () => void;
  onSetAlgset: (algset: string) => void;
  onDelete: () => void;
}

const STATUS_VIEW = {
  learned: { border: 'border-green-300', label: 'Memorized' },
  learning: { border: 'border-yellow-100', label: 'Learning' },
  none: { border: 'border-primary-100', label: '' },
} as const;

const YourAlgCard = ({ alg, status, algset, onToggleStatus, onSetAlgset, onDelete }: YourAlgCardProps) => {
  const [confirming, setConfirming] = useState(false);
  const [editingAlgset, setEditingAlgset] = useState(false);
  const [algsetDraft, setAlgsetDraft] = useState('');

  const [cubeColors] = useCubeColors();
  const view = STATUS_VIEW[status] || STATUS_VIEW.none;
  const classification = useMemo(() => classifyAlg(alg), [alg]);
  const iconClassification = classifyFavorite({ alg, algset });

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {

    // let the delete controls handle their own clicks instead of toggling the card
    if ((event.target as HTMLElement).closest('button')) return;

    onToggleStatus();
  };

  const openAlgsetEditor = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAlgsetDraft('');
    setEditingAlgset(true);
  };

  const commitAlgset = () => {
    onSetAlgset(algsetDraft.trim().slice(0, 6));
    setEditingAlgset(false);
  };

  return (
    <div
      onClick={handleCardClick}
      title="Click to toggle status"
      className="group relative flex flex-row items-center gap-3 cursor-pointer px-2 py-2 text-neutral-100 tracking-widest transition-colors duration-300"
    >
      {editingAlgset ? (
        <input
          autoFocus
          value={algsetDraft}
          maxLength={6}
          placeholder={classification.group}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setAlgsetDraft(e.target.value)}
          onBlur={commitAlgset}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitAlgset(); }
            if (e.key === 'Escape') { e.preventDefault(); setEditingAlgset(false); }
          }}
          className="h-6 w-13 shrink-0 border border-primary-300 bg-dark px-1 my-1.5 text-center text-xs tracking-normal text-primary-100 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={openAlgsetEditor}
          title="Click to set algset"
          className="self-stretch -my-2 aspect-square flex shrink-0 items-center justify-center tracking-normal focus-visible:outline-none focus-visible:ring focus-visible:ring-primary-900"
        >
          <AlgIcon classification={iconClassification} alg={alg} cubeColors={cubeColors} />
        </button>
      )}

      <div className="relative group-hover:static self-stretch -my-2 flex items-center min-w-0">
        <span className="min-w-0 wrap-break-word font-medium tracking-normal text-md" style={{wordSpacing: '8px'}}>{alg}</span>
        <span aria-hidden className={`pointer-events-none absolute inset-0 group-hover:border ${status === 'none' ? '' : 'border-b ' + view.border}`} />
      </div>

      <span className="hidden md:block ml-auto justify-self-stretch shrink-0 justify-text-end text-sm font-medium text-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">{confirming ? '' : view.label}</span>

      {confirming ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-sm border border-red-500 px-2 py-0.5 text-xs font-medium text-primary-200 hover:bg-red-900 transition-colors"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-sm border border-neutral-400 px-2 py-0.5 text-xs font-medium text-neutral-400 hover:bg-neutral-600 transition-colors duration-100"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          aria-label="Delete (Press shift to skip confirmation)"
          title="Delete (Press shift to skip confirmation)"
          onClick={(event) => (event.shiftKey ? onDelete() : setConfirming(true))}
          className="shrink-0 p-2 rounded text-neutral-400 opacity-100 md:opacity-0 transition-opacity duration-200 
          md:group-hover:opacity-100 group-focus-within:opacity-100 hover:text-red-500 
          focus-visible:outline-none focus-visible:ring focus-visible:ring-primary-900
          ml-auto md:ml-0"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
};

export default YourAlgCard;
