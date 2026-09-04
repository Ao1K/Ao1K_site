// Per-algset search keywords for saved algs. F2L is keyed by the slot the alg solves into;
// last layer sets are keyed by their case name. A set with no keywords hides the keyword
// filter entirely.

import { algSolvedSlots, type SlotKey } from './multislotSlots';
import type { AlgClassification } from './classifyAlg';

const SLOT_ORDER: SlotKey[] = ['FR', 'FL', 'BR', 'BL'];

const SLOT_LABEL: Record<SlotKey, string> = {
  FR: 'Front-right',
  FL: 'Front-left',
  BR: 'Back-right',
  BL: 'Back-left',
};

const SLOT_RANK = new Map(SLOT_ORDER.map((slot, i) => [SLOT_LABEL[slot], i]));

const SLOT_GROUPS = new Set(['F2L', 'ZBLS', 'F2L+EO']);

const isSlotGroup = (group: string): boolean => SLOT_GROUPS.has(group.trim().toUpperCase());

export const keywordLabel = (group: string): string =>
  isSlotGroup(group) ? 'slot' : 'case';

export const keywordsForAlg = (alg: string, classification: AlgClassification): string[] => {
  if (isSlotGroup(classification.group)) return algSolvedSlots(alg).map((slot) => SLOT_LABEL[slot]);

  const caseName = classification.stepInfo?.name;
  if (!caseName) return [];
  if (classification.kind === 'oll') return [`OLL ${caseName}`];
  if (classification.kind === 'pll' || classification.kind === 'zbll') return [caseName];
  return [];
};

export const compareKeywords = (a: string, b: string): number => {
  const slotA = SLOT_RANK.get(a);
  const slotB = SLOT_RANK.get(b);
  if (slotA !== undefined && slotB !== undefined) return slotA - slotB;
  return a.localeCompare(b, undefined, { numeric: true });
};
