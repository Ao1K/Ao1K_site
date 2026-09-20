'use client';

import type { Prompt } from '../../composables/notimer/db';
import { nextBooleanValue } from '../../composables/notimer/solveSession';
import { useInputMode, type InputMode } from '../../composables/useInputMode';

export type AnswerHintKey = 'number' | 'yes' | 'no' | 'blank';

export type HintVerbosity = 'verbose' | 'concise';

type TimerHints = {
  holdToTime: string;
  releaseToStart: string;
  stopTimer: React.ReactNode;
};

type AnswerHints = {
  answerBoolean: React.ReactNode;
  answer: Record<AnswerHintKey, string>;
};

export type InputHints = TimerHints & AnswerHints;

function KeyCap({ label }: { label: string }) {
  return (
    <kbd className="rounded border border-neutral-500 bg-dark px-2 py-0.5 text-sm leading-none text-primary-100">
      {label}
    </kbd>
  );
}

const KEYBOARD_ANSWER_HINTS: AnswerHints = {
  answerBoolean: (
    <span className="hidden shrink-0 flex-row items-center gap-1.5 text-sm whitespace-nowrap select-none md:flex">
      <KeyCap label="y" />
      <span className="text-neutral-400">or</span>
      <KeyCap label="n" />
    </span>
  ),
  answer: {
    number: 'Click to type a number',
    yes: 'Click to answer Yes',
    no: 'Click to answer No',
    blank: 'Click to leave blank',
  },
};

const TOUCH_ANSWER_HINTS: AnswerHints = {
  answerBoolean: null,
  answer: {
    number: 'Tap to type a number',
    yes: 'Tap to answer Yes',
    no: 'Tap to answer No',
    blank: 'Tap to leave blank',
  },
};

const ANSWER_HINTS: Record<InputMode, AnswerHints> = {
  keyboard: KEYBOARD_ANSWER_HINTS,
  touch: TOUCH_ANSWER_HINTS,
};

const VERBOSE_TIMER_HINTS: Record<InputMode, TimerHints> = {
  keyboard: {
    holdToTime: 'Hold space to time (optional)',
    releaseToStart: 'Release to start',
    stopTimer: 'Press any key to stop. Esc to cancel.',
  },
  touch: {
    holdToTime: 'Press and hold to time (optional)',
    releaseToStart: 'Release to start',
    stopTimer: 'Tap anywhere to stop. Back to cancel.',
  },
};

const CONCISE_TIMER_HINTS: TimerHints = {
  holdToTime: 'No time',
  releaseToStart: 'Ready',
  stopTimer: '',
};

const HINTS: Record<HintVerbosity, Record<InputMode, InputHints>> = {
  verbose: {
    keyboard: { ...ANSWER_HINTS.keyboard, ...VERBOSE_TIMER_HINTS.keyboard },
    touch: { ...ANSWER_HINTS.touch, ...VERBOSE_TIMER_HINTS.touch },
  },
  concise: {
    keyboard: { ...ANSWER_HINTS.keyboard, ...CONCISE_TIMER_HINTS },
    touch: { ...ANSWER_HINTS.touch, ...CONCISE_TIMER_HINTS },
  },
};

export function useInputHints(verbosity: HintVerbosity): InputHints {
  return HINTS[verbosity][useInputMode()];
}

export function answerHintKey(prompt: Prompt, value: number | null | undefined): AnswerHintKey {
  if (prompt.kind !== 'boolean') return 'number';
  const next = nextBooleanValue(value);
  if (next === null) return 'blank';
  return next ? 'yes' : 'no';
}
