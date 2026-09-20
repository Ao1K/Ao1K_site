'use client';

import Link from 'next/link';
import type { RowComponentProps } from 'react-window';
import type { Prompt, PromptPhase, Solve } from '../../composables/notimer/db';
import { customEncodeURL } from '../../composables/recon/urlEncoding';
import {
  editingView,
  isCancellable,
  isScrambleFocused,
  sanitizeDraft,
  type Session,
} from '../../composables/notimer/solveSession';
import { showToast } from '../../composables/toast';
import ArrowRightIcon from '../icons/arrowRight';
import CopyIcon from '../icons/copy';
import ReplayIcon from '../icons/replay';
import WriteIcon from '../icons/write';
import { promptGlyph } from './checklistConstants';
import {
  answerHintKey,
  useInputHints,
  type HintVerbosity,
  type InputHints,
} from './inputHints';

export type CreatedRow = { rowIndex: number; scramble: string };

export type SolveRowData = {
  solveCount: number;
  prePrompts: Prompt[];
  postPrompts: Prompt[];
  windowStart: number;
  solves: Solve[];
  answersBySolve: Map<number, Map<number, number | null>>;
  createdRow: CreatedRow | null;
  session: Session;
  pendingScramble: string | null;
  activeIndex: number;
  hintVerbosity: HintVerbosity;
  scrambleBoxRef: React.RefObject<HTMLDivElement | null>;
  onActivatePrompt: (rowIndex: number, phase: PromptPhase, promptIndex: number) => void;
  onDraftInput: (draft: string) => void;
  onDraftBlur: () => void;
  onHoldStart: (rowIndex: number) => void;
  onHoldEnd: (timeStamp: number) => void;
  onHoldCancel: () => void;
  onReset: (rowIndex: number) => void;
};

type RowState = 'loading' | 'placeholder' | 'recorded';

const NO_TIME_LABEL = 'No time';

type StatusContext = { hints: InputHints; timedLabel: string };

const ACTIVE_STATUS: Record<Session['phase'], (context: StatusContext) => React.ReactNode> = {
  armed: ({ hints }) => hints.releaseToStart,
  running: ({ hints }) => hints.stopTimer,
  holding: ({ timedLabel }) => timedLabel,
  idle: ({ hints, timedLabel }) => timedLabel || hints.holdToTime,
  editing: ({ hints, timedLabel }) => timedLabel || hints.holdToTime,
};

function timedLabel(solve: Solve | undefined): string {
  return solve?.durationMs == null ? '' : 'Time recorded';
}

function statusLabel(
  session: Session,
  rowState: RowState,
  isActive: boolean,
  solve: Solve | undefined,
  hints: InputHints,
): React.ReactNode {
  if (rowState === 'loading') return '';
  if (isActive) return ACTIVE_STATUS[session.phase]({ hints, timedLabel: timedLabel(solve) });
  if (rowState !== 'recorded') return '';
  return timedLabel(solve) || NO_TIME_LABEL;
}

const PHASE_TONE: Partial<Record<Session['phase'], string>> = {
  armed: 'text-green-300',
  running: 'text-dark_accent',
  // holding: 'text-yellow-100', // annoying to have this flash all the time
};

function statusTone(session: Session, isActive: boolean): string {
  if (!isActive) return 'text-neutral-500';
  return PHASE_TONE[session.phase] ?? 'text-neutral-400';
}

const IDLE_SCRAMBLE_BORDER = 'border-neutral-600';

function scrambleBoxTone(session: Session, isActive: boolean): string {
  if (!isActive) return IDLE_SCRAMBLE_BORDER;
  switch (session.phase) {
    case 'armed':
    case 'running':
      return 'border-green-300 bg-primary-800';
    default:
      return isScrambleFocused(session)
        ? 'border-primary-300 bg-primary-800'
        : IDLE_SCRAMBLE_BORDER;
  }
}

type AnswerTone = 'untouched' | 'blank' | 'value' | 'yes' | 'no';

const UNDERLINE = 'underline decoration-2 underline-offset-4';

const TEXT_TONE: Record<AnswerTone, string> = {
  untouched: 'text-neutral-600',
  blank: 'text-neutral-400',
  value: 'text-primary-100',
  yes: 'text-green-300',
  no: 'text-orange-300',
};

const UNDERLINE_TONE: Record<AnswerTone, string> = {
  untouched: '',
  blank: `${UNDERLINE} decoration-neutral-500`,
  value: `${UNDERLINE} decoration-primary-100`,
  yes: `${UNDERLINE} decoration-green-300`,
  no: `${UNDERLINE} decoration-orange-300`,
};

function answerTone(prompt: Prompt, value: number | null | undefined): AnswerTone {
  if (value === undefined) return 'untouched';
  if (value === null) return 'blank';
  if (prompt.kind !== 'boolean') return 'value';
  return value ? 'yes' : 'no';
}

function valueTone(prompt: Prompt, value: number | null | undefined): string {
  return TEXT_TONE[answerTone(prompt, value)];
}

function answerUnderline(prompt: Prompt, value: number | null | undefined): string {
  return UNDERLINE_TONE[answerTone(prompt, value)];
}

function valueLabel(prompt: Prompt, value: number | null | undefined): string {
  if (value === undefined) return '—';
  if (value === null) return 'Blank';
  if (prompt.kind === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

const VALUE_CELL = 'w-16 shrink-0 rounded-sm border px-1.5 py-0.5 text-right text-sm font-medium';

const ROW_ACTION =
  'flex h-7 min-w-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-sm border border-neutral-600 bg-dark px-5 text-dark_accent transition-colors hover:border-neutral-500 hover:text-primary-100 pointer-coarse:px-6';

function RowActionButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onPress();
      }}
      className={ROW_ACTION}
    >
      {children}
    </button>
  );
}

function RowActionLink({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      tabIndex={-1}
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className={ROW_ACTION}
    >
      {children}
    </Link>
  );
}

function reconHref(scramble: string, durationMs: number | null | undefined): string {
  const params = new URLSearchParams({ scramble: customEncodeURL(scramble) });
  if (durationMs != null) params.set('time', (durationMs / 1000).toFixed(3));
  return `/recon/?${params.toString()}`;
}

function NumberValue({
  prompt,
  value,
  isFocused,
  draft,
  onDraftInput,
  onDraftBlur,
}: {
  prompt: Prompt;
  value: number | null | undefined;
  isFocused: boolean;
  draft: string;
  onDraftInput: (draft: string) => void;
  onDraftBlur: () => void;
}) {
  if (isFocused) {
    return (
      <input
        data-checklist-draft=""
        autoFocus
        tabIndex={-1}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={prompt.text}
        value={draft}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => onDraftInput(sanitizeDraft(event.currentTarget.value))}
        onBlur={onDraftBlur}
        onClick={(event) => event.stopPropagation()}
        className={`${VALUE_CELL} border-primary-300 bg-dark text-primary-100 focus:outline-none`}
      />
    );
  }

  return (
    <span
      className={`${VALUE_CELL} relative border-transparent transition-colors group-hover:border-neutral-500 ${valueTone(prompt, value)}`}
    >
      {valueLabel(prompt, value)}
      <span className="absolute top-1/2 right-1.5 h-4 w-px -translate-y-1/2 animate-pulse bg-transparent group-hover:bg-primary-300" />
    </span>
  );
}

function PromptList({
  title,
  prompts,
  values,
  focusedIndex,
  draft,
  hints,
  onActivate,
  onDraftInput,
  onDraftBlur,
}: {
  title: string;
  prompts: Prompt[];
  values: Map<number, number | null> | undefined;
  focusedIndex: number | null;
  draft: string;
  hints: InputHints;
  onActivate: (promptIndex: number) => void;
  onDraftInput: (draft: string) => void;
  onDraftBlur: () => void;
}) {
  if (prompts.length === 0) return null;

  return (
    <div className="flex w-full min-h-0 flex-col">
      <div className="mb-1 shrink-0 border-b border-neutral-600 pb-1 text-sm font-medium text-dark_accent select-none">
        {title}
      </div>
      <ul className="scrollbar-hidden flex max-h-[33dvh] min-h-0 flex-col overflow-y-auto sm:max-h-none">
        {prompts.map((prompt, promptIndex) => {
          const isFocused = focusedIndex === promptIndex;
          const value = values?.get(prompt.id);

          return (
            <li key={prompt.id} className="shrink-0">
              <div
                onClick={() => onActivate(promptIndex)}
                title={hints.answer[answerHintKey(prompt, value)]}
                aria-current={isFocused}
                className={`group flex w-full cursor-pointer flex-row items-center gap-3 rounded-sm border px-2 py-1 text-left text-sm transition-colors ${
                  isFocused
                    ? 'border-primary-300 bg-primary-800'
                    : 'border-transparent hover:bg-neutral-800'
                }`}
              >
                <span
                  className={`w-5 shrink-0 text-center select-none ${
                    isFocused ? 'text-primary-200' : 'text-dark_accent'
                  }`}
                >
                  {promptGlyph(prompt.id)}
                </span>

                <span
                  title={prompt.text}
                  className={`min-w-0 grow truncate select-none ${answerUnderline(prompt, value)} ${
                    isFocused ? 'font-medium text-primary-100' : 'text-primary-200'
                  }`}
                >
                  {prompt.text}
                </span>

                {isFocused && prompt.kind === 'boolean' && hints.answerBoolean}

                {prompt.kind === 'number' ? (
                  <NumberValue
                    prompt={prompt}
                    value={value}
                    isFocused={isFocused}
                    draft={draft}
                    onDraftInput={onDraftInput}
                    onDraftBlur={onDraftBlur}
                  />
                ) : (
                  <span
                    className={`${VALUE_CELL} border-transparent ${valueTone(prompt, value)}`}
                  >
                    {valueLabel(prompt, value)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SolveRow({
  index,
  style,
  solveCount,
  prePrompts,
  postPrompts,
  windowStart,
  solves,
  answersBySolve,
  createdRow,
  session,
  pendingScramble,
  activeIndex,
  hintVerbosity,
  scrambleBoxRef,
  onActivatePrompt,
  onDraftInput,
  onDraftBlur,
  onHoldStart,
  onHoldEnd,
  onHoldCancel,
  onReset,
}: RowComponentProps<SolveRowData>) {
  const hints = useInputHints(hintVerbosity);
  const solve = solves[index - windowStart];
  const created = createdRow?.rowIndex === index ? createdRow : null;
  const isPlaceholder = index >= solveCount && created === null;

  const rowState: RowState = isPlaceholder ? 'placeholder' : solve ? 'recorded' : 'loading';
  const isActive = index === activeIndex;

  const values = solve ? answersBySolve.get(solve.id) : undefined;
  const scramble =
    solve?.scramble ?? created?.scramble ?? (isPlaceholder ? pendingScramble : null) ?? null;
  const scrambleText = scramble ?? (isPlaceholder ? 'Generating scramble' : '');

  const running = isActive && session.phase === 'running';
  const timerEngaged = isActive && isCancellable(session); 
  const canReset = !running && solve?.durationMs != null;
  const canUseScramble = !running && scramble !== null;

  const copyScramble = () => {
    if (scramble === null) return;
    navigator.clipboard
      .writeText(scramble)
      .then(() => showToast({ message: 'Scramble copied!', closable: false, duration: 2000 }))
      .catch((error) => console.error('Failed to copy scramble:', error));
  };

  const editing = editingView(session);
  const focusOn = editing?.rowIndex === index ? editing : null;
  const preFocus = focusOn?.promptPhase === 'pre' ? focusOn.promptIndex : null;
  const postFocus = focusOn?.promptPhase === 'post' ? focusOn.promptIndex : null;
  const draft = focusOn?.draft ?? '';

  return (
    <div style={{ ...style, scrollSnapAlign: 'start' }}>
      <div className="flex h-full min-h-0 flex-col justify-center gap-3 px-3 py-4 sm:gap-5 sm:px-4 sm:py-10">
        <PromptList
          title="Pre-solve checklist"
          prompts={prePrompts}
          values={values}
          focusedIndex={preFocus}
          draft={draft}
          hints={hints}
          onActivate={(promptIndex) => onActivatePrompt(index, 'pre', promptIndex)}
          onDraftInput={onDraftInput}
          onDraftBlur={onDraftBlur}
        />

        <div
          ref={isActive ? scrambleBoxRef : null}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            onHoldStart(index);
          }}
          onPointerUp={(event) => onHoldEnd(event.timeStamp)}
          onPointerCancel={onHoldCancel}
          onContextMenu={(event) => {
            if (timerEngaged) event.preventDefault();
          }}
          style={{ touchAction: 'manipulation' }}
          className={`w-full shrink-0 cursor-pointer rounded-sm border transition-colors ${scrambleBoxTone(session, isActive)}`}
        >
          <div className="flex h-9 items-center gap-2 border-b border-neutral-600 px-2 py-5 text-sm font-medium text-dark_accent select-none">
            <div className="flex min-w-0 flex-1 flex-row justify-between">
              <div className="flex min-w-0 flex-row gap-2">
                {canUseScramble && (
                  <RowActionButton label="Copy scramble" onPress={copyScramble}>
                    <CopyIcon className="h-3.5 w-3.5 shrink-0" />
                  </RowActionButton>
                )}
                {canUseScramble && (
                  <RowActionLink
                    label="Reconstruct Solve"
                    href={reconHref(scramble, solve?.durationMs)}
                  >
                    <ArrowRightIcon className="h-3.5 w-3.5 shrink-0" />
                    <WriteIcon className="h-4 w-4 shrink-0" />
                  </RowActionLink>
                )}
              </div>
              {canReset && (
                <RowActionButton label="Remove time" onPress={() => onReset(index)}>
                  <ReplayIcon className="h-3.5 w-3.5 shrink-0" />
                </RowActionButton>
              )}
            </div>
            <span
              className={`ml-auto truncate text-xs font-normal ${statusTone(session, isActive)}`}
            >
              {statusLabel(session, rowState, isActive, solve, hints)}
            </span>
          </div>
          <div className="grid min-h-16 place-items-center px-2 py-3 sm:min-h-24 sm:py-4">
            <span
              className={`[grid-area:1/1] text-lg md:text-2xl leading-relaxed font-medium wrap-break-word text-primary-100 pointer-coarse:select-none ${
                running ? 'invisible' : ''
              }`}
              style={{ wordSpacing: '6px' }}
            >
              {scrambleText}
            </span>
            {running && (
              <span className="flex [grid-area:1/1] gap-3 text-2xl font-medium text-primary-100 select-none">
                <span className="h-3 w-3 rounded-full bg-primary-100" />
                <span className="h-3 w-3 rounded-full bg-primary-100" />
                <span className="h-3 w-3 rounded-full bg-primary-100" />
              </span>
            )}
          </div>
        </div>

        <PromptList
          title="Post-solve checklist"
          prompts={postPrompts}
          values={values}
          focusedIndex={postFocus}
          draft={draft}
          hints={hints}
          onActivate={(promptIndex) => onActivatePrompt(index, 'post', promptIndex)}
          onDraftInput={onDraftInput}
          onDraftBlur={onDraftBlur}
        />

        {prePrompts.length === 0 && postPrompts.length === 0 && (
          <p className="px-2 text-sm text-neutral-500">
            No checklist items yet. Open the checklist to add some.
          </p>
        )}
      </div>
    </div>
  );
}
