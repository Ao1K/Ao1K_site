'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tokenize } from './algMoves';
import { classifyAlg } from './classifyAlg';
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
  const [value, setValue] = useState(initialAlg);
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

  const trackMoves = useCallback((_idIndex: number, _lineIndex: number, _caretIndex: number, moves: string[][]) => {
    const next = moves.flat().filter(Boolean).join(' ');
    setValue(next);
    onChangeRef.current?.(tokenize(next).join(' '));
    // re-editing invalidates a pending confirmation prompt
    setConfirming(false);
  }, []);

  // collapse runs of whitespace so storage and the icon see a clean move sequence
  const normalized = useMemo(() => tokenize(value).join(' '), [value]);
  const classification = useMemo(() => classifyAlg(normalized), [normalized]);
  const recognized = normalized !== '' && classification.kind !== 'unknown';

  const reset = () => {
    setValue('');
    setConfirming(false);
    onChangeRef.current?.('');
    editorRef.current?.transform('');
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
