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

const AddAlgRow = ({ onAdd, onCancel }: AddAlgRowProps) => {
  const [cubeColors] = useCubeColors();
  const [value, setValue] = useState('');
  const [confirming, setConfirming] = useState(false);

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
    <div className="flex flex-row items-center gap-3 px-2 py-2" onBlur={handleBlur}>
      <div className="h-6 shrink-0">
        <AlgIcon classification={classification} alg={normalized} cubeColors={cubeColors} />
      </div>

      <div
        className="min-w-0 flex-1
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
