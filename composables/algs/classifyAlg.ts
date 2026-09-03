// Detects which algset a manually entered alg belongs to, so the saved-alg UI can pick an icon.
// An alg solves whatever its inverse scrambles, so we run the inverse on a solved cube to reach
// the "before" case state, then ask the recon interpreter what step the alg completes from there.
// This reuses the same pipeline the recon page uses to label each solution line.

import { SimpleCube } from '../recon/SimpleCube';
import { SimpleCubeInterpreter, type Algset, type StepInfo } from '../recon/SimpleCubeInterpreter';
import { getNewSteps, getLineStepInfo } from '../recon/getLineStepInfo';
import { invertTokens, tokenize } from './algMoves';
import type { CompilableLLStep } from '../recon/LLinterpreter';

export type AlgsetKind = 'f2l' | 'multislot' | 'zbls' | 'f2leo' | 'oll' | 'pll' | 'zbll' | 'unknown';

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

const LL_STEPS: Record<string, CompilableLLStep | undefined> = { oll: 'oll', pll: 'pll', zbll: 'zbll' };

const F2L_STEPS: Record<string, Algset | undefined> = {
  f2l: 'f2l',
  zbls: 'zbls',
  'f2l+eo': 'f2leo',
  f2leo: 'f2leo',
};

const EO_STEPS = new Set<Algset>(['zbls', 'f2leo']);

const F2L_KIND = {
  plain: { lastSlot: 'f2l', multislot: 'multislot' },
  eo: { lastSlot: 'zbls', multislot: 'f2leo' },
} as const;

const F2L_GROUP: Record<'f2l' | 'multislot' | 'zbls' | 'f2leo', string> = {
  f2l: 'F2L', multislot: 'F2L', zbls: 'ZBLS', f2leo: 'F2L+EO',
};

const isLLkind = (kind: AlgsetKind): boolean => kind === 'oll' || kind === 'pll' || kind === 'zbll';

const isF2Lkind = (kind: AlgsetKind): boolean => kind in F2L_GROUP;

// an override that names an LL algset looks the case name up again in that set, so relabeling an
// alg from OLL to ZBLL gives it its ZBLL case name. Any other override text is only a label.
export const classifyFavorite = (f: { alg: string; algset?: string; sourceAlgset?: Algset }): AlgClassification => {
  if (!f.algset) return classifyAlg(f.alg, f.sourceAlgset);

  const name = f.algset.trim().toLowerCase().replace(/\s+/g, '');

  const f2lStep = F2L_STEPS[name];
  if (f2lStep) {
    const classification = classifyAlg(f.alg, f2lStep);
    return isF2Lkind(classification.kind) ? classification : overrideClassification(f.algset);
  }

  const llStep = LL_STEPS[name];
  if (!llStep) return overrideClassification(f.algset);

  const classification = classifyAlg(f.alg, llStep);
  return isLLkind(classification.kind) ? classification : overrideClassification(f.algset);
};

// base letter + optional turn count (2 or 3) and optional prime
const MOVE_RE = /^[UDFBLRudfblrMESxyz][23]?'?$/;

// reused across keystrokes; classification doesn't need the alg database
let interpreter: SimpleCubeInterpreter | null = null;

// the steps of a solved cube never change, so compute them once
let solvedSteps: StepInfo[] | null = null;
const getSolvedSteps = (interp: SimpleCubeInterpreter): StepInfo[] => {
  solvedSteps ??= interp.getStepsCompleted(new SimpleCube().getCubeState(['z2']), 'CFOP', true);
  return solvedSteps;
};

export function classifyAlg(alg: string, sourceAlgset?: Algset): AlgClassification {
  const llSource = sourceAlgset ? LL_STEPS[sourceAlgset] : undefined;
  const tokens = tokenize(alg);
  if (tokens.length === 0 || !tokens.every((t) => MOVE_RE.test(t))) return UNKNOWN;

  const beforeState = new SimpleCube().getCubeState(['z2', ...invertTokens(tokens)]);

  interpreter ??= new SimpleCubeInterpreter();
  // solved steps first so its internal state doesn't clobber the before-state read below
  const solved = getSolvedSteps(interpreter);
  const prevSteps = interpreter.getStepsCompleted(beforeState, 'CFOP');

  // mirror the recon page: the alg's effect is the delta the cube gains over the before state
  const newSteps = getNewSteps(prevSteps, solved);
  const { stepInfo } = getLineStepInfo(newSteps, prevSteps);
  if (!stepInfo) return UNKNOWN;

  if (stepInfo.type === 'f2l') {
    const eoRow = sourceAlgset != null && EO_STEPS.has(sourceAlgset) ? 'eo' : 'plain';
    const slotColumn = stepInfo.step === 'multislot' ? 'multislot' : 'lastSlot';
    const kind = F2L_KIND[eoRow][slotColumn];
    return { kind, label: F2L_GROUP[kind], group: F2L_GROUP[kind], stepInfo };
  }

  if (stepInfo.type === 'last layer') {
    const detected: CompilableLLStep =
      stepInfo.step === 'zbll' ? 'zbll'
        : stepInfo.nameType === 'pll' || stepInfo.step.includes('pll') ? 'pll'
          : 'oll';
    const step = llSource ?? detected;
    // the before state is still loaded in the interpreter, so the case is read off that pattern
    const caseName = interpreter.getLLcaseName(step);
    // the icon reads its label off the step info, so the resolved case has to land there too
    const named = caseName ? { ...stepInfo, name: caseName, nameType: step } : stepInfo;

    if (step === 'zbll') {
      return { kind: 'zbll', label: caseName ? `ZBLL ${caseName}` : 'ZBLL', group: 'ZBLL', stepInfo: named };
    }
    if (step === 'pll') {
      return { kind: 'pll', label: caseName || 'PLL', group: 'PLL', stepInfo: named };
    }
    return { kind: 'oll', label: caseName ? `OLL ${caseName}` : 'OLL', group: 'OLL', stepInfo: named };
  }

  return UNKNOWN;
}
