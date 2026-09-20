import { byDisplayOrder, db } from './db';
import type { Answer, Prompt, PromptKind, PromptPhase, Solve } from './db';

const APPEND_POSITION = Number.MAX_SAFE_INTEGER;

async function persistDisplayOrder(ordered: Prompt[]): Promise<void> {
  await Promise.all(
    ordered.map((prompt, position) =>
      prompt.position === position ? undefined : db.prompts.update(prompt.id, { position }),
    ),
  );
}

async function normalizeDisplayOrder(): Promise<void> {
  const prompts = await db.prompts.toArray();
  await persistDisplayOrder(prompts.sort(byDisplayOrder));
}

export async function countSolves(): Promise<number> {
  return db.solves.count();
}

export async function hasTimedSolve(): Promise<boolean> {
  const timed = await db.solves.filter((solve) => solve.durationMs !== null).first();
  return timed !== undefined;
}

export async function getSolveWindow(offset: number, limit: number): Promise<Solve[]> {
  if (limit <= 0) return [];
  return db.solves.orderBy('id').offset(offset).limit(limit).toArray();
}

export async function getAnswersFor(solveIds: number[]): Promise<Answer[]> {
  if (solveIds.length === 0) return [];
  return db.answers.where('solveId').anyOf(solveIds).toArray();
}

export async function listPrompts(): Promise<Prompt[]> {
  return db.prompts.where('retired').equals(0).sortBy('position');
}

export async function listHiddenPrompts(): Promise<Prompt[]> {
  return db.prompts.where('retired').equals(1).sortBy('position');
}

export async function recordSolve(solve: Omit<Solve, 'id'>): Promise<number> {
  return db.solves.add(solve);
}

export async function updateSolve(id: number, changes: Partial<Omit<Solve, 'id'>>): Promise<void> {
  await db.solves.update(id, changes);
}

export async function setAnswer(solveId: number, promptId: number, value: number | null): Promise<void> {
  await db.transaction('rw', db.answers, async () => {
    const existing = await db.answers.where('[solveId+promptId]').equals([solveId, promptId]).first();
    if (existing) {
      await db.answers.update(existing.id, { value });
    } else {
      await db.answers.add({ solveId, promptId, value });
    }
  });
}

export async function addPrompt(text: string, kind: PromptKind, phase: PromptPhase): Promise<number> {
  return db.transaction('rw', db.prompts, async () => {
    const id = await db.prompts.add({ text, kind, phase, position: APPEND_POSITION, retired: 0 });
    await normalizeDisplayOrder();
    return id;
  });
}

export async function updatePromptText(id: number, text: string): Promise<void> {
  await db.prompts.update(id, { text });
}

export async function updatePromptKind(id: number, kind: PromptKind): Promise<void> {
  await db.prompts.update(id, { kind });
}

export async function updatePromptPhase(id: number, phase: PromptPhase): Promise<void> {
  await db.transaction('rw', db.prompts, async () => {
    const moved = await db.prompts.get(id);
    if (!moved || moved.phase === phase) return;

    await db.prompts.update(id, { phase, position: APPEND_POSITION });
    await normalizeDisplayOrder();
  });
}

export async function hidePrompt(id: number): Promise<void> {
  await db.prompts.update(id, { retired: 1 });
}

export async function showPrompt(id: number): Promise<void> {
  await db.transaction('rw', db.prompts, async () => {
    await db.prompts.update(id, { retired: 0, position: APPEND_POSITION });
    await normalizeDisplayOrder();
  });
}

export async function deletePrompt(id: number): Promise<void> {
  await db.transaction('rw', db.prompts, db.answers, async () => {
    await db.answers.where('promptId').equals(id).delete();
    await db.prompts.delete(id);
  });
}

export async function reorderPrompt(id: number, to: number): Promise<void> {
  await db.transaction('rw', db.prompts, async () => {
    const all = (await db.prompts.toArray()).sort(byDisplayOrder);

    const target = all.find((prompt) => prompt.id === id);
    if (!target) return;

    const isSibling = (prompt: Prompt) => prompt.phase === target.phase && prompt.retired === 0;
    const siblings = all.filter(isSibling);
    const from = siblings.findIndex((prompt) => prompt.id === id);

    if (to === from || to < 0 || to >= siblings.length) return;

    const [moved] = siblings.splice(from, 1);
    siblings.splice(to, 0, moved);

    let taken = 0;
    await persistDisplayOrder(
      all.map((prompt) => (isSibling(prompt) ? siblings[taken++] : prompt)),
    );
  });
}

export async function deleteSolve(id: number): Promise<void> {
  await db.transaction('rw', db.solves, db.answers, async () => {
    await db.answers.where('solveId').equals(id).delete();
    await db.solves.delete(id);
  });
}

