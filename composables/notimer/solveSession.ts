import type { Prompt, PromptKind, PromptPhase } from './db';

export const HOLD_TO_ARM_MS = 350;
export const MAX_NUMBER_DRAFT_LENGTH = 6;

export type EditingSession = {
  phase: 'editing';
  rowIndex: number;
  promptPhase: PromptPhase;
  promptIndex: number;
  draft: string;
  pristine: boolean;
};

export type Session =
  | EditingSession
  | { phase: 'idle' }
  | { phase: 'holding'; resume: EditingSession | null; advanceOnTap: boolean }
  | { phase: 'armed' }
  | { phase: 'running'; startedAt: Date; startTimeStamp: number };

export const idleSession: Session = { phase: 'idle' };

export function openingSession(rowIndex: number, preCount: number): Session {
  if (preCount === 0) return idleSession;
  return { phase: 'editing', rowIndex, promptPhase: 'pre', promptIndex: 0, draft: '', pristine: true };
}

export function editingView(session: Session): EditingSession | null {
  if (session.phase === 'editing') return session;
  if (session.phase === 'holding') return session.resume;
  return null;
}

export function isCancellable(session: Session): boolean {
  return session.phase === 'holding' || session.phase === 'armed' || session.phase === 'running';
}

export function isScrambleFocused(session: Session): boolean {
  if (session.phase === 'holding') return session.resume === null;
  return session.phase !== 'editing';
}

export function draftFor(prompt: Prompt | undefined, value: number | null | undefined): string {
  if (prompt?.kind !== 'number' || value === null || value === undefined) return '';
  return String(value);
}

export function nextBooleanValue(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return 1;
  return value ? 0 : null;
}

export function sanitizeDraft(raw: string): string {
  const digitsAndDots = raw.replace(/[^0-9.]/g, '');
  const [whole, ...afterFirstDot] = digitsAndDots.split('.');
  const single = afterFirstDot.length === 0 ? whole : `${whole}.${afterFirstDot.join('')}`;
  return single.slice(0, MAX_NUMBER_DRAFT_LENGTH);
}

const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'ContextMenu',
  'OS',
  'Dead',
]);

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}

function appendDraftKey(draft: string, key: string): string | null {
  if (draft.length >= MAX_NUMBER_DRAFT_LENGTH) return null;
  if (key >= '0' && key <= '9') return draft + key;
  if (key === '.' && draft !== '' && !draft.includes('.')) return draft + key;
  return null;
}

export function parseDraft(draft: string): number | null {
  if (draft === '') return null;
  const parsed = Number(draft);
  return Number.isFinite(parsed) ? parsed : null;
}

export type AnswerIntent =
  | { type: 'value'; value: number | null }
  | { type: 'draft'; draft: string }
  | { type: 'step'; offset: -1 | 1 }
  | { type: 'exit' }
  | { type: 'ignore' };

const IGNORE: AnswerIntent = { type: 'ignore' };

export type DraftField = { kind: PromptKind; draft: string; pristine: boolean };

export function interpretAnswerKey(key: string, shiftKey: boolean, field: DraftField): AnswerIntent {
  if (key === 'Escape') return { type: 'exit' };
  if (key === 'ArrowUp' || (key === 'Tab' && shiftKey)) return { type: 'step', offset: -1 };
  if (key === 'ArrowDown' || key === 'Tab') return { type: 'step', offset: 1 };

  if (field.kind === 'boolean') {
    if (key === 'y' || key === 'Y' || key === '1') return { type: 'value', value: 1 };
    if (key === 'n' || key === 'N' || key === '0') return { type: 'value', value: 0 };
    if (key === ' ' || key === 'Enter') return { type: 'value', value: null };
    return IGNORE;
  }

  if (key === ' ' || key === 'Enter') return { type: 'value', value: parseDraft(field.draft) };
  if (key === 'Backspace') return { type: 'draft', draft: field.draft.slice(0, -1) };

  const typed = field.pristine ? '' : field.draft;
  const nextDraft = appendDraftKey(typed, key);
  return nextDraft === null ? IGNORE : { type: 'draft', draft: nextDraft };
}
