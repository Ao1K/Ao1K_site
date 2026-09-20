import { shapesTable } from '../../utils/shapesTable';
import type { PromptKind, PromptPhase } from '../../composables/notimer/db';

export const SECTIONS: { phase: PromptPhase; title: string; empty: string; placeholder: string }[] = [
  {
    phase: 'pre',
    title: 'Pre-solve checklist',
    empty: 'Nothing is asked before a solve yet.',
    placeholder: 'Ask yourself something before the solve',
  },
  {
    phase: 'post',
    title: 'Post-solve checklist',
    empty: 'Nothing is asked after a solve yet.',
    placeholder: 'Ask yourself something after the solve',
  },
];

export const OTHER_PHASE: Record<PromptPhase, PromptPhase> = { pre: 'post', post: 'pre' };

export const KINDS: PromptKind[] = ['boolean', 'number'];

export const KIND_LABEL: Record<PromptKind, string> = { boolean: 'Yes / No', number: 'Number' };

export const coarseTouchTarget = 'pointer-coarse:min-h-11';

export const textInputClass =
  `min-w-32 flex-1 rounded-sm border border-neutral-600 bg-dark px-1.5 py-1 text-sm text-primary-100 focus:border-neutral-500 focus:outline-none ${coarseTouchTarget}`;

export function promptGlyph(id: number): string {
  if (id > 100) return (shapesTable[Math.floor(id / 100)] ?? '◦') + (shapesTable[id % 100] ?? '◦');
  return shapesTable[id] ?? '◦';
}
