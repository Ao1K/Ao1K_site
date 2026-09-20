'use client';

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { List, useListRef } from 'react-window';
import { useLiveQuery } from 'dexie-react-hooks';

import {
  countSolves,
  getAnswersFor,
  getSolveWindow,
  listPrompts,
  recordSolve,
  setAnswer,
  updateSolve,
} from '../../composables/notimer/dbUtils';
import type { Prompt, PromptPhase } from '../../composables/notimer/db';
import {
  HOLD_TO_ARM_MS,
  draftFor,
  idleSession,
  interpretAnswerKey,
  isCancellable,
  isModifierKey,
  nextBooleanValue,
  openingSession,
  parseDraft,
  type EditingSession,
  type Session,
} from '../../composables/notimer/solveSession';
import { markTimedSolve, useTimedSolveLatch } from '../../composables/notimer/timedSolveLatch';
import { useScrambleQueue } from '../../composables/notimer/useScrambleQueue';
import { useBackCancel } from '../../composables/useBackCancel';
import { useInputMode } from '../../composables/useInputMode';
import { setHeaderHidden } from '../../composables/useHeaderAutoHide';
import { dismissToast, showToast } from '../../composables/toast';
import { notimerTaglines } from '../../utils/notimerTaglines';
import AngleDown from '../icons/angleDown';
import ChecklistEditor from './ChecklistEditor';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';
import SolveRow, { type CreatedRow, type SolveRowData } from './SolveRow';
import RollingNumber from './stats/RollingNumber';
import TimingOverlay, { zoomFrom, type TimingZoom } from './TimingOverlay';
import { useInputHints } from './inputHints';

const PUZZLE_TYPE = '333';
const SCRAMBLE_QUEUE_DEPTH = 2;
const HEADER_REVEAL_THRESHOLD_PX = 8;
const NO_PROMPTS: Prompt[] = [];

function solveRangeWithin(
  renderedRange: { start: number; stop: number },
  solveTotal: number,
): { start: number; limit: number } {
  const stop = Math.min(renderedRange.stop, solveTotal - 1);
  const start = Math.min(renderedRange.start, Math.max(stop, 0));
  return { start, limit: stop - start + 1 };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.dataset.checklistDraft !== undefined) return false;
  if (target.isContentEditable) return true;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

interface SolveFeedProps {
  onCursorChange?: (rowIndex: number) => void;
  keyboardBlocked?: boolean;
  footerSlot?: React.ReactNode;
}

export default function SolveFeed({
  onCursorChange,
  keyboardBlocked = false,
  footerSlot,
}: SolveFeedProps) {
  const listRef = useListRef(null);
  const scrambleBoxRef = useRef<HTMLDivElement | null>(null);
  const armTimeout = useRef<number | null>(null);
  const hasPositioned = useRef(false);
  const scrollTarget = useRef<number | null>(null);
  const claimedSolve = useRef<{ rowIndex: number; solveId: Promise<number> } | null>(null);
  const unconfirmedWrites = useRef(new Map<string, number | null>());
  const lastScrollTop = useRef(0);
  const stoppedByThisTap = useRef(false);
  const awayFromBottom = useRef(false);
  const advanceBlockedToast = useRef<number | null>(null);

  const solveCount = useLiveQuery(() => countSolves(), [], undefined);
  const prompts = useLiveQuery(() => listPrompts(), [], undefined);
  const timedSolveLatched = useTimedSolveLatch();
  const touchInput = useInputMode() === 'touch';

  const [optimisticSolveCount, setOptimisticSolveCount] = useState(0);
  const [renderedRange, setRenderedRange] = useState({ start: 0, stop: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [session, setSession] = useState<Session>(idleSession);
  const [createdRow, setCreatedRow] = useState<CreatedRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [maxViewedRow, setMaxViewedRow] = useState(0);
  const [edgeNotice, setEdgeNotice] = useState<{ edge: 'top' | 'bottom'; seq: number } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [tagline, setTagline] = useState('');
  const [timingZoom, setTimingZoom] = useState<TimingZoom | null>(null);

  const hintVerbosity = timedSolveLatched ? 'concise' : 'verbose';
  const hints = useInputHints(hintVerbosity);

  useEffect(() => {
    if (notimerTaglines.length === 0) return;
    setTagline(notimerTaglines[Math.floor(Math.random() * notimerTaglines.length)]);
  }, []);

  const solveTotal = Math.max(solveCount ?? 0, optimisticSolveCount);

  const moveCursor = useCallback(
    (rowIndex: number) => {
      const rowsFromBottom = solveTotal - rowIndex;
      if (rowsFromBottom === 0) awayFromBottom.current = false;
      else if (rowsFromBottom > 1) awayFromBottom.current = true;

      setActiveIndex(rowIndex);
      setMaxViewedRow((previous) => Math.max(previous, rowIndex));
      onCursorChange?.(rowIndex);
    },
    [onCursorChange, solveTotal],
  );

  const { next: pendingScramble, consume: consumeScramble } = useScrambleQueue(
    PUZZLE_TYPE,
    SCRAMBLE_QUEUE_DEPTH,
  );

  const promptList = prompts ?? NO_PROMPTS;
  const prePrompts = useMemo(() => promptList.filter((p) => p.phase === 'pre'), [promptList]);
  const postPrompts = useMemo(() => promptList.filter((p) => p.phase === 'post'), [promptList]);

  const { start: solveStart, limit: solveLimit } = solveRangeWithin(renderedRange, solveTotal);

  const windowData = useLiveQuery(
    async () => {
      const solves = await getSolveWindow(solveStart, solveLimit);
      const answers = await getAnswersFor(solves.map((solve) => solve.id));
      return { start: solveStart, solves, answers };
    },
    [solveStart, solveLimit],
    undefined,
  );

  const answersBySolve = useMemo(() => {
    const bySolve = new Map<number, Map<number, number | null>>();
    for (const answer of windowData?.answers ?? []) {
      let forSolve = bySolve.get(answer.solveId);
      if (!forSolve) {
        forSolve = new Map();
        bySolve.set(answer.solveId, forSolve);
      }
      forSolve.set(answer.promptId, answer.value);
    }
    return bySolve;
  }, [windowData]);

  const isReady = solveCount !== undefined && prompts !== undefined;

  const positionAtNewestRow = useCallback(
    (size: { height: number; width: number }) => {
      if (hasPositioned.current || size.height === 0) return;
      if (solveCount === undefined || !listRef.current) return;
      hasPositioned.current = true;
      moveCursor(solveCount);
      setSession(openingSession(solveCount, prePrompts.length));
      listRef.current.scrollToRow({ index: solveCount, align: 'start', behavior: 'instant' });
    },
    [solveCount, prePrompts.length, listRef, moveCursor],
  );

  const promptsFor = (phase: PromptPhase) => (phase === 'pre' ? prePrompts : postPrompts);

  const solveAt = (rowIndex: number) => windowData?.solves[rowIndex - windowData.start];

  const placeholderRow = () =>
    Math.max(solveTotal, claimedSolve.current ? claimedSolve.current.rowIndex + 1 : 0);

  const storedValueAt = (rowIndex: number, promptId: number) => {
    const solve = solveAt(rowIndex);
    return solve ? answersBySolve.get(solve.id)?.get(promptId) : undefined;
  };

  const valueAt = (rowIndex: number, promptId: number) => {
    const key = `${rowIndex}:${promptId}`;
    const stored = storedValueAt(rowIndex, promptId);
    if (!unconfirmedWrites.current.has(key)) return stored;
    const written = unconfirmedWrites.current.get(key) ?? null;
    if (stored === written) unconfirmedWrites.current.delete(key);
    return stored === written ? stored : written;
  };

  const focusPrompt = (
    rowIndex: number,
    promptPhase: PromptPhase,
    promptIndex: number,
  ): EditingSession => {
    const prompt = promptsFor(promptPhase)[promptIndex];
    return {
      phase: 'editing',
      rowIndex,
      promptPhase,
      promptIndex,
      draft: draftFor(prompt, prompt && valueAt(rowIndex, prompt.id)),
      pristine: true,
    };
  };

  const existingSolveId = (rowIndex: number): Promise<number> | null => {
    const claimed = claimedSolve.current;
    if (claimed?.rowIndex === rowIndex) return claimed.solveId;

    const existing = solveAt(rowIndex);
    return existing ? Promise.resolve(existing.id) : null;
  };

  const claimSolveId = (rowIndex: number): Promise<number> | null => {
    const existing = existingSolveId(rowIndex);
    if (existing) return existing;
    if (rowIndex !== placeholderRow()) return null;

    const scramble = pendingScramble ?? '';
    const solveId = recordSolve({
      scramble,
      puzzleType: PUZZLE_TYPE,
      startedAt: new Date(),
      durationMs: null,
    });
    claimedSolve.current = { rowIndex, solveId };
    setCreatedRow({ rowIndex, scramble });
    consumeScramble();
    setOptimisticSolveCount(rowIndex + 1);
    return solveId;
  };

  const writeAnswer = (rowIndex: number, promptId: number, value: number | null) => {
    const claimed = claimSolveId(rowIndex);
    if (!claimed) return;
    unconfirmedWrites.current.set(`${rowIndex}:${promptId}`, value);
    claimed.then((solveId) => setAnswer(solveId, promptId, value));
  };

  const clearArmTimeout = () => {
    if (armTimeout.current === null) return;
    window.clearTimeout(armTimeout.current);
    armTimeout.current = null;
  };

  const goToRow = (index: number, nextSession: Session) => {
    const isAdjacent = Math.abs(index - activeIndex) <= 1;
    flushSync(() => {
      setOptimisticSolveCount((previous) => Math.max(previous, index));
      setEdgeNotice(null);
      moveCursor(index);
      setSession(nextSession);
      setSnapEnabled(false);
    });
    scrollTarget.current = index;
    listRef.current?.scrollToRow({
      index,
      align: 'start',
      behavior: isAdjacent ? 'smooth' : 'instant',
    });
  };

  const goToNextRow = (rowIndex: number) => {
    const next = rowIndex + 1;
    goToRow(next, next === placeholderRow() ? openingSession(next, prePrompts.length) : idleSession);
  };

  const isUntouched = (rowIndex: number, prompt: Prompt) =>
    valueAt(rowIndex, prompt.id) === undefined;

  const firstUntouchedPrompt = (rowIndex: number) => {
    for (const phase of ['pre', 'post'] as const) {
      const promptIndex = promptsFor(phase).findIndex((prompt) => isUntouched(rowIndex, prompt));
      if (promptIndex !== -1) return { phase, promptIndex };
    }
    return null;
  };

  const untouchedPromptSession = (rowIndex: number): Session | null => {
    const untouched = firstUntouchedPrompt(rowIndex);
    if (!untouched) return null;
    return focusPrompt(rowIndex, untouched.phase, untouched.promptIndex);
  };

  const hasRecordedTime = (rowIndex: number) => solveAt(rowIndex)?.durationMs != null;

  const finishRow = (rowIndex: number) => {
    const untouched = untouchedPromptSession(rowIndex);
    if (untouched) {
      setSession(untouched);
      return;
    }
    if (rowIndex < placeholderRow()) goToNextRow(rowIndex);
  };

  const warnNothingToAdvanceTo = () => {
    if (advanceBlockedToast.current !== null) dismissToast(advanceBlockedToast.current);
    advanceBlockedToast.current = showToast({
      message: 'Complete a checklist item before advancing',
      closable: false,
      duration: 2500,
    });
  };

  const commitDraft = (editing: EditingSession) => {
    if (editing.pristine) return;
    const prompt = promptsFor(editing.promptPhase)[editing.promptIndex];
    if (!prompt || prompt.kind !== 'number') return;
    writeAnswer(editing.rowIndex, prompt.id, parseDraft(editing.draft));
  };

  const moveFocus = (editing: EditingSession, offset: -1 | 1) => {
    const next = editing.promptIndex + offset;
    if (next >= 0 && next < promptsFor(editing.promptPhase).length) {
      setSession(focusPrompt(editing.rowIndex, editing.promptPhase, next));
      return;
    }
    if (editing.promptPhase === 'pre') {
      if (next < 0) return;
      if (hasRecordedTime(editing.rowIndex)) finishRow(editing.rowIndex);
      else setSession(idleSession);
      return;
    }
    if (next < 0) {
      setSession(idleSession);
      return;
    }
    finishRow(editing.rowIndex);
  };

  const leaveScramble = (rowIndex: number) => {
    if (postPrompts.length > 0) {
      setSession(focusPrompt(rowIndex, 'post', 0));
      return;
    }
    finishRow(rowIndex);
  };

  const advanceRow = () => {
    if (activeIndex >= placeholderRow()) {
      warnNothingToAdvanceTo();
      return;
    }
    if (session.phase === 'editing') commitDraft(session);
    goToNextRow(activeIndex);
  };

  const retreatRow = () => {
    if (activeIndex === 0) {
      setEdgeNotice((previous) => ({ edge: 'top', seq: (previous?.seq ?? 0) + 1 }));
      return;
    }
    if (session.phase === 'editing') commitDraft(session);
    goToRow(activeIndex - 1, idleSession);
  };

  const beginHold = (resume: EditingSession | null, tapAdvances: boolean) => {
    clearArmTimeout();
    armTimeout.current = window.setTimeout(() => {
      armTimeout.current = null;
      if (resume) commitDraft(resume);
      setSession({ phase: 'armed' });
    }, HOLD_TO_ARM_MS);
    setSession({ phase: 'holding', resume, advanceOnTap: tapAdvances && resume === null });
  };

  const startRunning = (startTimeStamp: number) => {
    setSession({ phase: 'running', startedAt: new Date(), startTimeStamp });
    if (touchInput) setTimingZoom(zoomFrom(scrambleBoxRef.current));
  };

  const endTimingZoom = (phase: 'stopped' | 'cancelled') => {
    setTimingZoom((previous) => (previous?.phase === 'running' ? { ...previous, phase } : previous));
  };

  const stopTimer = (running: Extract<Session, { phase: 'running' }>, stopTimeStamp: number) => {
    const rowIndex = activeIndex;
    const durationMs = stopTimeStamp - running.startTimeStamp;
    claimSolveId(rowIndex)?.then((solveId) =>
      updateSolve(solveId, { startedAt: running.startedAt, durationMs }),
    );
    markTimedSolve();
    endTimingZoom('stopped');

    if (postPrompts.length === 0) {
      finishRow(rowIndex);
      return;
    }
    setSession(focusPrompt(rowIndex, 'post', 0));
  };

  const cancelTarget = (): Session => {
    if (session.phase === 'holding' && session.resume) return session.resume;
    if (session.phase === 'running') {
      if (!hasRecordedTime(activeIndex)) return idleSession;
      return untouchedPromptSession(activeIndex) ?? idleSession;
    }
    if (prePrompts.length === 0) return idleSession;
    return focusPrompt(activeIndex, 'pre', 0);
  };

  const cancelSession = () => {
    if (!isCancellable(session)) return;
    clearArmTimeout();
    endTimingZoom('cancelled');
    setSession(cancelTarget());
  };

  const handleEditingKey = (event: KeyboardEvent, editing: EditingSession) => {
    const prompt = promptsFor(editing.promptPhase)[editing.promptIndex];
    if (!prompt) {
      setSession(idleSession);
      return;
    }

    const intent = interpretAnswerKey(event.key, event.shiftKey, {
      kind: prompt.kind,
      draft: editing.draft,
      pristine: editing.pristine,
    });
    if (intent.type === 'ignore') return;
    event.preventDefault();

    if (intent.type === 'exit') {
      setSession(idleSession);
      return;
    }
    if (intent.type === 'draft') {
      setSession({ ...editing, draft: intent.draft, pristine: false });
      return;
    }
    const wasUnanswered = isUntouched(editing.rowIndex, prompt);
    const offset = intent.type === 'step' ? intent.offset : 1;

    if (intent.type === 'step') commitDraft(editing);
    else writeAnswer(editing.rowIndex, prompt.id, intent.value);

    const rowNowComplete = firstUntouchedPrompt(editing.rowIndex) === null;

    if (offset === 1 && wasUnanswered && rowNowComplete) {
      finishRow(editing.rowIndex);
      return;
    }
    moveFocus(editing, offset);
  };

  const handleScrambleKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      if (prePrompts.length === 0) return;
      event.preventDefault();
      setSession(focusPrompt(activeIndex, 'pre', prePrompts.length - 1));
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault();
      leaveScramble(activeIndex);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (editorOpen || shortcutsOpen || keyboardBlocked || isEditableTarget(event.target)) return;
    if (event.key === ' ') event.preventDefault();

    if (event.ctrlKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const betweenSolves = session.phase === 'idle' || session.phase === 'editing';
      if (!betweenSolves || event.repeat) return;
      if (event.key === 'ArrowDown') advanceRow();
      else retreatRow();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isModifierKey(event.key)) return;

    if (event.key === 'Escape' && isCancellable(session)) {
      event.preventDefault();
      cancelSession();
      return;
    }

    if (session.phase === 'running') {
      event.preventDefault();
      stopTimer(session, event.timeStamp);
      return;
    }
    if (session.phase === 'holding' || session.phase === 'armed') {
      event.preventDefault();
      return;
    }

    if (event.key === ' ' && !event.repeat) {
      event.preventDefault();
      beginHold(session.phase === 'editing' ? session : null, true);
      return;
    }

    if (session.phase === 'editing') {
      handleEditingKey(event, session);
      return;
    }
    handleScrambleKey(event);
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (editorOpen || shortcutsOpen || keyboardBlocked || isEditableTarget(event.target)) return;
    if (event.key !== ' ') return;
    if (session.phase !== 'holding' && session.phase !== 'armed') return;
    event.preventDefault();
    clearArmTimeout();

    if (session.phase === 'armed') {
      startRunning(event.timeStamp);
      return;
    }
    if (session.resume) {
      handleEditingKey(event, session.resume);
      return;
    }
    if (session.advanceOnTap) {
      leaveScramble(activeIndex);
      return;
    }
    setSession(idleSession);
  };

  const handleWindowBlur = () => {
    clearArmTimeout();
    setSession((previous) => {
      if (previous.phase === 'holding') return previous.resume ?? idleSession;
      if (previous.phase === 'armed') return idleSession;
      return previous;
    });
  };

  const handleWindowPointerDown = (event: PointerEvent) => {
    if (session.phase !== 'running') {
      stoppedByThisTap.current = false;
      return;
    }
    stoppedByThisTap.current = true;
    stopTimer(session, event.timeStamp);
  };

  const handleHoldStart = (rowIndex: number) => {
    if (session.phase === 'running') return;
    if (rowIndex !== activeIndex) {
      goToRow(rowIndex, idleSession);
      return;
    }
    if (session.phase === 'editing') commitDraft(session);
    beginHold(null, false);
  };

  const handleHoldEnd = (timeStamp: number) => {
    if (session.phase !== 'holding' && session.phase !== 'armed') return;
    clearArmTimeout();
    if (session.phase === 'armed') {
      startRunning(timeStamp);
      return;
    }
    setSession(idleSession);
  };

  const handleHoldCancel = () => {
    if (session.phase !== 'holding' && session.phase !== 'armed') return;
    clearArmTimeout();
    setSession(idleSession);
  };

  useBackCancel(touchInput && isCancellable(session), cancelSession);

  const onWindowKeyDown = useEffectEvent(handleKeyDown);
  const onWindowKeyUp = useEffectEvent(handleKeyUp);
  const onWindowBlur = useEffectEvent(handleWindowBlur);
  const onWindowPointerDown = useEffectEvent(handleWindowPointerDown);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => onWindowKeyDown(event);
    const keyUp = (event: KeyboardEvent) => onWindowKeyUp(event);
    const blur = () => onWindowBlur();
    const pointerDown = (event: PointerEvent) => onWindowPointerDown(event);

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    window.addEventListener('pointerdown', pointerDown);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointerdown', pointerDown);
    };
  }, []);

  const edgeNoticeFor = (index: number): 'top' | 'bottom' | null => {
    if (index === 0) return maxViewedRow > 0 ? 'top' : null;
    if (index === solveTotal) return awayFromBottom.current ? 'bottom' : null;
    return null;
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const rowHeight = event.currentTarget.clientHeight;
    if (rowHeight === 0) return;

    const scrollTop = event.currentTarget.scrollTop;
    const travelled = scrollTop - lastScrollTop.current;
    if (Math.abs(travelled) > HEADER_REVEAL_THRESHOLD_PX) {
      lastScrollTop.current = scrollTop;
      setHeaderHidden(travelled > 0);
    }

    const index = Math.round(scrollTop / rowHeight);
    if (scrollTarget.current !== null) {
      if (index !== scrollTarget.current) return;
      scrollTarget.current = null;
      setSnapEnabled(true);
    }
    if (index === activeIndex) return;
    const edge = edgeNoticeFor(index);
    moveCursor(index);
    setSession((previous) =>
      previous.phase === 'editing' && previous.rowIndex !== index ? idleSession : previous,
    );
    setEdgeNotice((previous) => (edge === null ? null : { edge, seq: (previous?.seq ?? 0) + 1 }));
  };

  const releaseScrollTarget = useCallback(() => {
    scrollTarget.current = null;
    setSnapEnabled(true);
  }, []);

  const handleRowsRendered = useCallback(
    (
      _visible: { startIndex: number; stopIndex: number },
      all: { startIndex: number; stopIndex: number },
    ) => {
      setRenderedRange((previous) =>
        previous.start === all.startIndex && previous.stop === all.stopIndex
          ? previous
          : { start: all.startIndex, stop: all.stopIndex },
      );

      if (scrollTarget.current === null) setSnapEnabled(true);
    },
    [],
  );

  const handleActivatePrompt = (rowIndex: number, phase: PromptPhase, promptIndex: number) => {
    if (stoppedByThisTap.current) return;

    const prompt = promptsFor(phase)[promptIndex];
    if (prompt?.kind === 'boolean') {
      writeAnswer(rowIndex, prompt.id, nextBooleanValue(valueAt(rowIndex, prompt.id)));
    }
    const focus = focusPrompt(rowIndex, phase, promptIndex);
    if (rowIndex === activeIndex) {
      setSession(focus);
      return;
    }
    goToRow(rowIndex, focus);
  };

  const handleDraftInput = (draft: string) => {
    setSession((previous) =>
      previous.phase === 'editing' ? { ...previous, draft, pristine: false } : previous,
    );
  };

  const handleDraftBlur = () => {
    if (session.phase === 'editing') commitDraft(session);
  };

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
  }, []);

  const closeShortcuts = useCallback(() => {
    setShortcutsOpen(false);
  }, []);

  const pendingIndex = solveTotal;
  const hasRowsAbove = activeIndex > 0;
  const hasRowsBelow = activeIndex < solveTotal;
  const showJumpToNewest = activeIndex < maxViewedRow;

  const jumpToNewest = () => {
    goToRow(pendingIndex, openingSession(pendingIndex, prePrompts.length));
  };

  const resetSolve = (rowIndex: number) => {
    clearArmTimeout();
    existingSolveId(rowIndex)?.then((solveId) => updateSolve(solveId, { durationMs: null }));
    if (rowIndex === activeIndex) setSession(idleSession);
  };

  const rowProps: SolveRowData = {
    solveCount: solveTotal,
    prePrompts,
    postPrompts,
    windowStart: windowData?.start ?? 0,
    solves: windowData?.solves ?? [],
    answersBySolve,
    createdRow,
    session,
    pendingScramble,
    activeIndex,
    hintVerbosity,
    scrambleBoxRef,
    onActivatePrompt: handleActivatePrompt,
    onDraftInput: handleDraftInput,
    onDraftBlur: handleDraftBlur,
    onHoldStart: handleHoldStart,
    onHoldEnd: handleHoldEnd,
    onHoldCancel: handleHoldCancel,
    onReset: resetSolve,
  };

  if (!isReady) {
    return <div className="grid min-h-0 flex-1 place-items-center text-neutral-400">Loading</div>;
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          onPointerDown={releaseScrollTarget}
          onWheel={releaseScrollTarget}
          className="relative min-h-0 flex-1"
        >
          <List
            className="scrollbar-hidden"
            listRef={listRef}
            rowComponent={SolveRow}
            rowCount={solveTotal + 1}
            rowHeight="100%"
            rowProps={rowProps}
            overscanCount={1}
            onScroll={handleScroll}
            onResize={positionAtNewestRow}
            onRowsRendered={handleRowsRendered}
            style={{ height: '100%', scrollSnapType: snapEnabled ? 'y mandatory' : 'none' }}
          />

          <span className="pointer-events-none absolute top-4 left-3 flex flex-row items-center gap-1 text-sm font-medium text-dark_accent bg-dark select-none sm:left-4">
            #<RollingNumber value={activeIndex + 1} />
          </span>

          {hasRowsAbove && (
            <AngleDown
              aria-hidden
              className="pointer-events-none absolute top-4 left-1/2 h-5 w-5 -translate-x-1/2 rotate-180 text-neutral-500"
            />
          )}
          {hasRowsBelow && (
            <AngleDown
              aria-hidden
              className="pointer-events-none absolute bottom-4 left-1/2 h-5 w-5 -translate-x-1/2 text-neutral-500"
            />
          )}
          {showJumpToNewest && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={jumpToNewest}
              className="absolute right-4 bottom-4 rounded-sm border border-dark_accent bg-dark px-1.5 py-0.5 text-xs text-dark_accent transition-colors hover:bg-primary-800 hover:text-primary-100"
            >
              Scroll to bottom
            </button>
          )}

          {edgeNotice && (
            <div
              key={edgeNotice.seq}
              onAnimationEnd={() => setEdgeNotice(null)}
              className={`animate-edge-flash pointer-events-none absolute left-1/2 rounded-sm border border-dark_accent bg-dark px-3 py-1 text-xs font-medium text-dark_accent ${
                edgeNotice.edge === 'top' ? 'top-4' : 'bottom-4'
              }`}
            >
              {edgeNotice.edge === 'top' ? 'Start of solves' : 'End of solves'}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-x-4 gap-y-1 border-t border-neutral-600 bg-dark px-4 py-2 text-xs text-neutral-500">
          <span className="mr-auto">{tagline}</span>
          <span className="flex flex-row items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setShortcutsOpen(true)}
              className="rounded-sm border border-neutral-600 bg-dark px-1.5 py-0.5 text-dark_accent transition-colors hover:border-neutral-500 hover:text-primary-100"
            >
              Keyboard shortcuts
            </button>
            {footerSlot}
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setEditorOpen(true)}
              className="rounded-sm border border-neutral-600 bg-dark px-1.5 py-0.5 text-dark_accent transition-colors hover:border-neutral-500 hover:text-primary-100"
            >
              Edit checklist
            </button>
          </span>
        </div>
      </div>

      {timingZoom && (
        <TimingOverlay
          zoom={timingZoom}
          hint={hints.stopTimer}
          onExitEnd={() => setTimingZoom(null)}
        />
      )}

      {editorOpen && <ChecklistEditor prompts={promptList} onClose={closeEditor} />}
      {shortcutsOpen && <KeyboardShortcutsDialog onClose={closeShortcuts} />}
    </>
  );
}
