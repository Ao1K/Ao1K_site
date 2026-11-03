'use client';

// A single saved alg in the "Your Algs" list. Clicking the card toggles its status between
// learning (light yellow) and memorized (light green). An inline trash → confirm flow deletes
// it without a modal. The step icon is chosen from the alg's detected algset (F2L pair, OLL/PLL
// grid, or a text box); clicking the icon lets the user override the algset label.

import { useMemo, useState } from 'react';
import type { AlgStatus } from '../../composables/algs/algFavorites';
import type { Algset } from '../../composables/recon/SimpleCubeInterpreter';
import { classifyAlg, classifyFavorite } from '../../composables/algs/classifyAlg';
import { cube3x3, type Move3x3 } from '../../utils/parser/cube3x3';
import { useCubeColors } from '../../composables/useSettings';
import AlgIcon from './AlgIcon';
import AlgTextEditor from './AlgTextEditor';
import CloseIcon from '../icons/close';
import PencilIcon from '../icons/write';

interface YourAlgCardProps {
  moves: Move3x3[];
  status: AlgStatus;
  algset?: string;
  sourceAlgset?: Algset;
  editMode: boolean;
  active: boolean;
  confirming: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onToggleStatus: () => void;
  onSetAlgset: (algset: string) => void;
  onSetAlg: (moves: Move3x3[]) => void;
  onDelete: () => void;
}

const STATUS_VIEW = {
  learned: { border: 'border-green-300', decoration: 'decoration-green-300', label: 'Memorized', nextHint: 'Click to mark as unlearned' },
  learning: { border: 'border-yellow-100', decoration: 'decoration-yellow-100', label: 'Learning', nextHint: 'Click to mark as memorized' },
  none: { border: 'border-primary-100', decoration: 'decoration-primary-100', label: '', nextHint: 'Click to mark as learning' },
} as const;

const EditButton = ({ className, onClick }: { className: string; onClick: (event: React.MouseEvent) => void }) => (
  <button
    type="button"
    aria-label="Edit alg"
    title="Edit alg"
    onClick={onClick}
    className={`shrink-0 items-center justify-center p-2 rounded text-neutral-400 transition-opacity duration-200
    hover:text-primary-100 focus-visible:outline-none focus-visible:ring focus-visible:ring-primary-900 ${className}`}
  >
    <PencilIcon className="w-4 h-4" />
  </button>
);

const YourAlgCard = ({ moves, status, algset, sourceAlgset, editMode, active, confirming, onEditStart, onEditEnd, onConfirmDelete, onCancelDelete, onToggleStatus, onSetAlgset, onSetAlg, onDelete }: YourAlgCardProps) => {
  const [algDraft, setAlgDraft] = useState<Move3x3[] | null>(null);
  const [editingAlgset, setEditingAlgset] = useState(false);
  const [algsetDraft, setAlgsetDraft] = useState('');

  const [cubeColors] = useCubeColors();
  const view = STATUS_VIEW[status] || STATUS_VIEW.none;
  const editingAlg = active;
  // the icon follows the uncommitted draft while editing, so it updates as the alg is typed
  const iconMoves = active ? (algDraft ?? moves) : moves;
  const classification = useMemo(() => classifyAlg(iconMoves, sourceAlgset), [iconMoves, sourceAlgset]);
  const iconClassification = useMemo(
    () => (algset ? classifyFavorite({ moves: iconMoves, algset, sourceAlgset }) : classification),
    [iconMoves, algset, sourceAlgset, classification],
  );

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (editingAlg) return;

    // let the delete controls handle their own clicks instead of toggling the card
    if ((event.target as HTMLElement).closest('button')) return;

    onToggleStatus();
  };

  const openAlgEditor = (event: React.MouseEvent) => {
    event.stopPropagation();
    onCancelDelete();
    setAlgDraft(moves);
    onEditStart();
  };

  const commitAlg = (next: string) => {
    onSetAlg(cube3x3.parse(next).moves);
    setAlgDraft(null);
    onEditEnd();
  };

  const cancelAlgEdit = () => {
    setAlgDraft(null);
    onEditEnd();
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
      title={view.nextHint}
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
          className="group/icon self-stretch -my-2 aspect-square flex shrink-0 items-center justify-center tracking-normal focus-visible:outline-none focus-visible:ring focus-visible:ring-primary-900"
        >
          <AlgIcon classification={iconClassification} moves={iconMoves} cubeColors={cubeColors} />
        </button>
      )}

      {editingAlg ? (
        <AlgTextEditor
          alg={cube3x3.format(moves)}
          onCommit={commitAlg}
          onChange={(draft) => setAlgDraft(cube3x3.parse(draft).moves)}
          onCancel={cancelAlgEdit}
        />
      ) : (
        <>
          <div className="relative group-hover:static self-stretch -my-2 flex items-center min-w-0">
            <span
              className={`min-w-0 wrap-break-word font-medium tracking-normal text-md md:no-underline
              ${status === 'none' ? '' : `underline decoration-2 underline-offset-4 ${view.decoration}`}`}
              style={{wordSpacing: '8px'}}
            >
              {cube3x3.format(moves)}
            </span>
            <span aria-hidden className={`pointer-events-none absolute inset-0 hidden md:block group-hover:border ${status === 'none' ? '' : 'border-b ' + view.border}`} />
          </div>

          <EditButton
            onClick={openAlgEditor}
            className={`hidden opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 ${confirming ? '' : 'md:flex'}`}
          />

          <span className="hidden md:block ml-auto justify-self-stretch shrink-0 justify-text-end text-sm font-medium text-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">{confirming ? '' : view.label}</span>

          <span className={`flex shrink-0 flex-col items-center justify-center ml-auto md:ml-0 ${editMode ? 'max-h-16' : ''}`}>
            <EditButton onClick={openAlgEditor} className={editMode && !confirming ? 'flex md:hidden' : 'hidden'} />

            {confirming ? (
              <span className="flex shrink-0 flex-col md:flex-row items-stretch md:items-center gap-1">
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-sm border border-red-500 px-2 py-0.5 text-xs font-medium text-primary-200 hover:bg-red-900 transition-colors"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={onCancelDelete}
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
                onClick={(event) => (event.shiftKey ? onDelete() : onConfirmDelete())}
                className={`shrink-0 p-2 rounded text-neutral-400 transition-opacity duration-200
                md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 hover:text-red-500
                focus-visible:outline-none focus-visible:ring focus-visible:ring-primary-900
                ${editMode ? 'opacity-100' : 'hidden md:block'}`}
              >
                <CloseIcon />
              </button>
            )}
          </span>
        </>
      )}
    </div>
  );
};

export default YourAlgCard;
