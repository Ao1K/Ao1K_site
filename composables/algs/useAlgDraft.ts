'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { classifyAlg } from './classifyAlg';
import { cube3x3, type Move3x3 } from '../../utils/parser/cube3x3';
import type { ImperativeRef } from '../../components/recon/MovesTextEditor';

/**
 * Shared state for the alg move editors (adding a new alg, editing a saved one). Seeds the
 * editor with initialAlg, tracks the typed moves, and gates committing behind a confirmation
 * when the alg doesn't solve a step the interpreter recognizes. resetOnCommit clears the
 * editor after a commit, for the add row that stays open to take another alg. onChange reports
 * the normalized moves as they are typed, for a parent that renders off the uncommitted draft.
 */
interface AlgDraftOptions {
  resetOnCommit?: boolean;
  onChange?: (alg: string) => void;
}

export function useAlgDraft(initialAlg: string, onCommit: (alg: string) => void, options: AlgDraftOptions = {}) {
  const { resetOnCommit = false, onChange } = options;
  const [moves, setMoves] = useState<Move3x3[]>(() => cube3x3.parse(initialAlg).moves);
  const [html, setHTML] = useState(initialAlg === '' ? '' : `<div>${initialAlg}<br></div>`);
  const [confirming, setConfirming] = useState(false);

  const editorRef = useRef<ImperativeRef>(null);
  const moveHistory = useRef({ history: [['', '']], index: 0, MAX_HISTORY: 100, status: 'loading' });
  const seeded = useRef(initialAlg !== '');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const element = editorRef.current?.getElement();
    if (!element) return;
    element.focus();
    if (!seeded.current) return;

    const frame = requestAnimationFrame(() => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const trackMoves = useCallback((_idIndex: number, _lineIndex: number, _caretIndex: number, lineMoves: Move3x3[][]) => {
    const next = lineMoves.flat();
    setMoves(next);
    onChangeRef.current?.(cube3x3.format(next));
    // re-editing invalidates a pending confirmation prompt
    setConfirming(false);
  }, []);

  const normalized = cube3x3.format(moves);
  const classification = useMemo(() => classifyAlg(moves), [moves]);
  const recognized = normalized !== '' && classification.kind !== 'unknown';

  const reset = () => {
    setMoves([]);
    setConfirming(false);
    onChangeRef.current?.('');
    editorRef.current?.setContent('');
  };

  const commit = () => {
    onCommit(normalized);
    setConfirming(false);
    if (resetOnCommit) reset();
  };

  const submit = () => {
    if (normalized === '') return;
    if (recognized) commit();
    else setConfirming(true);
  };

  return {
    normalized,
    classification,
    confirming,
    dismissConfirm: () => setConfirming(false),
    submit,
    commit,
    editorProps: { ref: editorRef, html, setHTML, trackMoves, moveHistory },
  };
}
