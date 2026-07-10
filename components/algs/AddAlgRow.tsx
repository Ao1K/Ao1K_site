'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlgIcon from './AlgIcon';
import { classifyAlg } from '../../composables/algs/classifyAlg';
import { useCubeColors } from '../../composables/useSettings';
import { tokenize } from '../../composables/algs/algMoves';
import MovesTextEditor, { type ImperativeRef } from '../recon/MovesTextEditor';

interface AddAlgRowProps {
  onAdd: (alg: string) => void;
  onCancel: () => void;
}

const abbreviateAlg = (alg: string) => {
  const moves = alg.split(' ');
  if (moves.length <= 6) return alg;
  return `${moves.slice(0, 6).join(' ')}…`;
};

const AddAlgRow = ({ onAdd, onCancel }: AddAlgRowProps) => {
  const [cubeColors] = useCubeColors();
  const [value, setValue] = useState('');
  const [confirming, setConfirming] = useState(false);

  const [added, setAdded] = useState<{ text: string; key: number } | null>(null);

  const [html, setHTML] = useState('');
  const editorRef = useRef<ImperativeRef>(null);
  const moveHistory = useRef({ history: [['', '']], index: 0, MAX_HISTORY: 100, status: 'loading' });

  useEffect(() => {
    editorRef.current?.getElement()?.focus();
  }, []);

  const trackMoves = useCallback((_idIndex: number, _lineIndex: number, _caretIndex: number, moves: string[][]) => {
    setValue(moves.flat().filter(Boolean).join(' '));
    // re-editing invalidates a pending "add anyway" prompt
    setConfirming(false);
  }, []);

  // collapse runs of whitespace so storage and the icon see a clean move sequence
  const normalized = useMemo(() => tokenize(value).join(' '), [value]);
  const classification = useMemo(() => classifyAlg(normalized), [normalized]);
  const recognized = normalized !== '' && classification.kind !== 'unknown';

  const commit = () => {
    onAdd(normalized);
    setAdded((prev) => ({ text: abbreviateAlg(normalized), key: (prev?.key ?? 0) + 1 }));
    setValue('');
    setConfirming(false);
    editorRef.current?.transform('');
  };

  const submit = () => {
    if (normalized === '') return;
    if (recognized) commit();
    else setConfirming(true);
  };

  // dismiss empty on blur
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (normalized !== '') return;
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    onCancel();
  };

  return (
    <div className="flex flex-row flex-wrap items-center justify-end gap-3 px-2 py-1" onBlur={handleBlur}>
      <div className="shrink-0 -my-3 flex items-center justify-center">
        <AlgIcon classification={classification} alg={normalized} cubeColors={cubeColors} />
      </div>

      <div
        className="relative min-w-40 flex-1
          **:[[contenteditable]]:min-h-0 **:[[contenteditable]]:py-1
          **:[[contenteditable]]:text-base"
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); submit(); }
          if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
        }}
      >
        <MovesTextEditor
          name="addAlg"
          ref={editorRef}
          trackMoves={trackMoves}
          autofocus={false}
          moveHistory={moveHistory}
          updateHistoryBtns={() => {}}
          html={html}
          setHTML={setHTML}
          lineHeight={24}
          simpleInput
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

      {confirming ? (
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-neutral-400">Alg solves unknown step. Add anyway?</span>
          <button
            type="button"
            onClick={commit}
            className="rounded-sm border border-primary-300 px-2 py-0.5 text-xs font-medium text-primary-200 hover:bg-primary-900 transition-colors"
          >
            Add
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
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={normalized === ''}
            className="rounded-sm border border-primary-300 px-2 py-0.5 text-xs font-medium text-primary-200 hover:bg-primary-900 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Add
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-neutral-400 px-2 py-0.5 text-xs font-medium text-neutral-400 hover:bg-neutral-600 transition-colors duration-100"
          >
            Cancel
          </button>
        </span>
      )}
    </div>
  );
};

export default AddAlgRow;
