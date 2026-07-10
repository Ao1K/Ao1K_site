// Detects which algset a manually entered alg belongs to, so the saved-alg UI can pick an icon.
// An alg solves whatever its inverse scrambles, so we run the inverse on a solved cube to reach
// the "before" case state, then ask the recon interpreter what step the alg completes from there.
// This reuses the same pipeline the recon page uses to label each solution line.

import { SimpleCube } from '../recon/SimpleCube';
import { SimpleCubeInterpreter, type StepInfo } from '../recon/SimpleCubeInterpreter';
import { getNewSteps, getLineStepInfo } from '../recon/getLineStepInfo';
import { tokenize } from './algMoves';

export type AlgsetKind = 'f2l' | 'multislot' | 'oll' | 'pll' | 'unknown';

export interface AlgClassification {
  kind: AlgsetKind;
  label: string;
  group: string;
  // carries gridPattern/name/nameType for icon rendering
  stepInfo: StepInfo | null;
}

const UNKNOWN: AlgClassification = { kind: 'unknown', label: '?', group: '?', stepInfo: null };

export const overrideClassification = (algset: string): AlgClassification => ({
  kind: 'unknown',
  label: algset,
  group: algset,
  stepInfo: null,
});

export const classifyFavorite = (f: { alg: string; algset?: string }): AlgClassification =>
  f.algset ? overrideClassification(f.algset) : classifyAlg(f.alg);

// base letter + optional single/double/double-prime suffix
const MOVE_RE = /^[UDFBLRudfblrMESxyz](?:2'|['2])?$/;

const invertToken = (m: string): string =>
  m.endsWith('2') ? m
    : m.endsWith("2'") ? m.slice(0, -1)
      : m.endsWith("'") ? m.slice(0, -1)
        : m + "'";

// reused across keystrokes; classification doesn't need the alg database
let interpreter: SimpleCubeInterpreter | null = null;

// the steps of a solved cube never change, so compute them once
let solvedSteps: StepInfo[] | null = null;
const getSolvedSteps = (interp: SimpleCubeInterpreter): StepInfo[] => {
  solvedSteps ??= interp.getStepsCompleted(new SimpleCube().getCubeState([]), 'CFOP', true);
  return solvedSteps;
};

export function classifyAlg(alg: string): AlgClassification {
  const tokens = tokenize(alg);
  if (tokens.length === 0 || !tokens.every((t) => MOVE_RE.test(t))) return UNKNOWN;

  const inverse = tokens.slice().reverse().map(invertToken);
  const beforeState = new SimpleCube().getCubeState(inverse);

  interpreter ??= new SimpleCubeInterpreter();
  // solved steps first so its internal state doesn't clobber the before-state read below
  const solved = getSolvedSteps(interpreter);
  const prevSteps = interpreter.getStepsCompleted(beforeState, 'CFOP');

  // mirror the recon page: the alg's effect is the delta the cube gains over the before state
  const newSteps = getNewSteps(prevSteps, solved);
  const { stepInfo } = getLineStepInfo(newSteps, prevSteps);
  if (!stepInfo) return UNKNOWN;

  if (stepInfo.type === 'f2l') {
    return stepInfo.step === 'multislot'
      ? { kind: 'multislot', label: 'F2L', group: 'F2L', stepInfo }
      : { kind: 'f2l', label: 'F2L', group: 'F2L', stepInfo };
  }

  if (stepInfo.type === 'last layer') {
    if (stepInfo.nameType === 'pll' || stepInfo.step.includes('pll')) {
      return { kind: 'pll', label: stepInfo.name || 'PLL', group: 'PLL', stepInfo };
    }
    return { kind: 'oll', label: 'OLL', group: 'OLL', stepInfo };
  }

  return UNKNOWN;
}
