'use client';

import { useMemo, useState } from 'react';
import AlgIcon from './AlgIcon';
import AlgDraftActions from './AlgDraftActions';
import { useCubeColors } from '../../composables/useSettings';
import { useAlgDraft } from '../../composables/algs/useAlgDraft';
import MovesTextEditor from '../recon/MovesTextEditor';
import { cube3x3, type Move3x3 } from '../../utils/parser/cube3x3';

interface AddAlgRowProps {
  onAdd: (moves: Move3x3[]) => boolean;
  onCancel: () => void;
}

const ABBREVIATED_MOVE_COUNT = 6;

const AddAlgRow = ({ onAdd, onCancel }: AddAlgRowProps) => {
  const [cubeColors] = useCubeColors();
  const [added, setAdded] = useState<{ text: string; key: number } | null>(null);

  const draft = useAlgDraft('', (alg) => {
    const moves = cube3x3.parse(alg).moves;
    if (!onAdd(moves)) return;
    const shownMoves = cube3x3.format(moves.slice(0, ABBREVIATED_MOVE_COUNT));
    const text = moves.length > ABBREVIATED_MOVE_COUNT ? `${shownMoves}…` : shownMoves;
    setAdded((prev) => ({ text, key: (prev?.key ?? 0) + 1 }));
  }, { resetOnCommit: true });

  const draftMoves = useMemo(() => cube3x3.parse(draft.normalized).moves, [draft.normalized]);

  // dismiss empty on blur
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (draft.normalized !== '') return;
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    onCancel();
  };

  return (
    <div className="flex flex-row flex-wrap items-center justify-end gap-3 px-2 py-1" onBlur={handleBlur}>
      <div className="shrink-0 -my-3 flex items-center justify-center">
        <AlgIcon classification={draft.classification} moves={draftMoves} cubeColors={cubeColors} />
      </div>

      <div
        className="relative min-w-40 flex-1
          **:[[contenteditable]]:min-h-0 **:[[contenteditable]]:py-1
          **:[[contenteditable]]:text-base"
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); draft.submit(); }
          if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
        }}
      >
        <MovesTextEditor
          name="addAlg"
          autofocus={false}
          lineHeight={24}
          simpleInput
          {...draft.editorProps}
        />
        {added && (
          <span
            key={added.key}
            onAnimationEnd={() => setAdded(null)}
            className="animate-added-pulse pointer-events-none absolute left-0 top-full mt-0.5 whitespace-nowrap text-xs text-neutral-300"
          >
            {added.text} added
          </span>
        )}
      </div>

      <AlgDraftActions
        actionLabel="Add"
        confirming={draft.confirming}
        disabled={draft.normalized === ''}
        onSubmit={draft.submit}
        onCommit={draft.commit}
        onDismissConfirm={draft.dismissConfirm}
        onCancel={onCancel}
      />
    </div>
  );
};

export default AddAlgRow;
