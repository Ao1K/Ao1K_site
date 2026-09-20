import Dexie, { type EntityTable } from 'dexie';

export type PromptKind = 'boolean' | 'number';

export type PromptPhase = 'pre' | 'post';

const PHASE_SEQUENCE: PromptPhase[] = ['pre', 'post'];

export function byDisplayOrder(a: Prompt, b: Prompt): number {
  return (
    PHASE_SEQUENCE.indexOf(a.phase) - PHASE_SEQUENCE.indexOf(b.phase) || a.position - b.position
  );
}

export interface Prompt {
  id: number;
  text: string;
  kind: PromptKind;
  phase: PromptPhase;
  position: number;
  retired: 0 | 1;
}

export interface Solve {
  id: number;
  scramble: string;
  puzzleType: string;
  startedAt: Date;
  durationMs: number | null;
}

export interface Answer {
  id: number;
  solveId: number;
  promptId: number;
  value: number | null;
}

const DEFAULT_PROMPTS: { text: string; kind: PromptKind; phase: PromptPhase }[] = [
  { text: 'Feeling relaxed', kind: 'boolean', phase: 'pre' },
  { text: 'Planned full cross', kind: 'boolean', phase: 'pre' },
  { text: 'Cross move count', kind: 'number', phase: 'pre' },
  { text: 'No extra U moves to find pieces', kind: 'boolean', phase: 'post' },
  { text: 'No extra y moves to find pieces', kind: 'boolean', phase: 'post' },
  { text: 'Recognized OLL from three sides', kind: 'boolean', phase: 'post' },
];

const db = new Dexie('Ao1KNotimer') as Dexie & {
  prompts: EntityTable<Prompt, 'id'>;
  solves: EntityTable<Solve, 'id'>;
  answers: EntityTable<Answer, 'id'>;
};

db.version(1).stores({
  prompts: '++id, position, retired, phase',
  solves: '++id, startedAt',
  answers: '++id, solveId, promptId, [solveId+promptId]',
});

db.on('populate', (transaction) =>
  transaction.table<Omit<Prompt, 'id'>, number>('prompts').bulkAdd(
    DEFAULT_PROMPTS.map(({ text, kind, phase }, position) => ({
      text,
      kind,
      phase,
      position,
      retired: 0 as const,
    })),
  ),
);

export { db };
