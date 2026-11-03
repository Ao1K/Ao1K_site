import type { CompilableLLStep, SuggestableLLStep } from './LLinterpreter';
import { addPostAuf, llAlgKey } from '../algs/algMoves';
import { cube3x3 } from '../../utils/parser/cube3x3';
import type { Move3x3 } from '../../utils/parser/cube3x3';

export interface CompiledLLAlg {
  caseIndex: number;
  alg: string;
  refPieceMovement: number; // the number of clockwise 90 degree turns of effective green-white piece to go from front-right to starting position of alg
  minMovements: number[]; // the number of clockwise 90 degree turns to go from starting position to the minimum key position
  frequency?: number; // how often this alg is used in competition solves
}

export type LLAlg = Omit<CompiledLLAlg, 'alg'> & { moves: Move3x3[] };

export interface KnownLLAlg {
  algset: CompilableLLStep;
  frequency: number;
  topCaseFrequency: number;
}

export interface KnownLLAlgMatch {
  algset: CompilableLLStep;
  compiledAlg: LLAlg;
  caseAlgs: LLAlg[];
}

const AUF_BY_INDEX: readonly Move3x3[][] = [[], ['U'], ['U2'], ["U'"]];
const AUF_COST = [0, 1, 2, 1]; // none, U, U2, U'
const AUF_PREFERENCE = [0, 1, 3, 2]; // tiebreaker: prefer no AUF, then U, U', U2
const AUF_BY_CASE_INDEX: readonly Move3x3[][] = [[], ["U'"], ['U2'], ['U']];

type ValidAlg = { moves: Move3x3[], frequency: number };

export type LLAlgMatch = ValidAlg & { offHand: boolean };

const knownAlgKey = (moves: readonly Move3x3[]): string => {
  let keptLength = moves.length;
  while (keptLength > 1 && cube3x3.isRotation(moves[keptLength - 1])) keptLength--;
  return llAlgKey(moves.slice(0, keptLength));
};

const loadLLAlgs = (algs: CompiledLLAlg[]): LLAlg[] =>
  algs.map(({ alg, ...rest }) => ({ ...rest, moves: cube3x3.parseTrusted(alg) }));

export default class LLsuggester {
  private ollAlgs: LLAlg[] = [];
  private pllAlgs: LLAlg[] = [];
  private zbllAlgs: LLAlg[] = [];
  private ollOffHandAlgs: LLAlg[] = [];
  private pllOffHandAlgs: LLAlg[] = [];
  private zbllOffHandAlgs: LLAlg[] = [];
  private knownAlgsByKey: Map<string, KnownLLAlgMatch[]> | null = null;

  public addAlgs(step: CompilableLLStep, compiledAlgs: CompiledLLAlg[]): void {
    this.knownAlgsByKey = null;
    const algs = loadLLAlgs(compiledAlgs);
    if (step === 'oll') {
      this.ollAlgs = algs;
    } else if (step === 'pll') {
      this.pllAlgs = algs;
    } else if (step === 'zbll') {
      this.zbllAlgs = algs;
    }
  }

  public addOffHandAlgs(step: CompilableLLStep, compiledAlgs: CompiledLLAlg[]): void {
    const algs = loadLLAlgs(compiledAlgs);
    if (step === 'oll') {
      this.ollOffHandAlgs = algs;
    } else if (step === 'pll') {
      this.pllOffHandAlgs = algs;
    } else if (step === 'zbll') {
      this.zbllOffHandAlgs = algs;
    }
  }

  private calcPreAUF(alg: LLAlg, caseMovementsToMin: number[]): number {
    let preAUFidx = 4; // Initialize to max+1

    caseMovementsToMin.forEach(caseMove => {
      alg.minMovements.forEach(algMove => {
        const candidateIdx = (4 + algMove - caseMove) % 4;

        const currentPref = AUF_PREFERENCE.indexOf(preAUFidx);
        const candidatePref = AUF_PREFERENCE.indexOf(candidateIdx);
        if (currentPref === -1 || candidatePref < currentPref) {
          preAUFidx = candidateIdx;
        }
      });
    });

    return preAUFidx === 4 ? 0 : preAUFidx;
  }

  private calcPostAUF(preAUFidx: number, alg: LLAlg, refPieceOrigins: number[]): number {

    const targetOrigin = (4 + alg.refPieceMovement - preAUFidx) % 4;
    const refPieceOrigin = refPieceOrigins.findIndex(origin => origin === targetOrigin);

    return (4 - refPieceOrigin) % 4;
  }

  private getValidOllAlgs(algs: LLAlg[], caseIndex: number, minMovements: number[]): ValidAlg[] {
    const validAlgs: ValidAlg[] = [];
    algs.forEach(alg => {
      if (alg.caseIndex !== caseIndex) {
        return;
      }

      const preAUFidx = this.calcPreAUF(alg, minMovements);

      validAlgs.push({ moves: [...AUF_BY_INDEX[preAUFidx], ...alg.moves], frequency: alg.frequency ?? 0 });
    });
    return validAlgs;
  }

  private getValidPrePostAufAlgs(algs: LLAlg[], caseIndex: number, minMovements: number[], refPieceOrigins: number[]): ValidAlg[] {
    const validAlgs: ValidAlg[] = [];

    algs.forEach(alg => {
      if (alg.caseIndex !== caseIndex) {
        return;
      }

      // evaluate all valid (preAUF, postAUF) pairs and pick the cheapest
      let bestPreAUF = 0;
      let bestPostAUF = 0;
      let bestCost = Infinity;
      let bestPrePref = Infinity;

      minMovements.forEach(caseMove => {
        alg.minMovements.forEach(algMove => {
          const preAUFidx = (4 + algMove - caseMove) % 4;
          const postAUFidx = this.calcPostAUF(preAUFidx, alg, refPieceOrigins);

          const totalCost = AUF_COST[preAUFidx] + AUF_COST[postAUFidx];
          const prePref = AUF_PREFERENCE.indexOf(preAUFidx);

          if (totalCost < bestCost || (totalCost === bestCost && prePref < bestPrePref)) {
            bestPreAUF = preAUFidx;
            bestPostAUF = postAUFidx;
            bestCost = totalCost;
            bestPrePref = prePref;
          }
        });
      });

      const fullAlg = addPostAuf([...AUF_BY_INDEX[bestPreAUF], ...alg.moves], AUF_BY_INDEX[bestPostAUF]);
      validAlgs.push({ moves: fullAlg, frequency: alg.frequency ?? 0 });
    });
    return validAlgs;
  }

  private matchBothHands(inHand: LLAlg[], offHand: LLAlg[], getValidAlgs: (algs: LLAlg[]) => ValidAlg[]): LLAlgMatch[] {
    return [
      ...getValidAlgs(inHand).map(valid => ({ ...valid, offHand: false })),
      ...getValidAlgs(offHand).map(valid => ({ ...valid, offHand: true })),
    ];
  }

  public getAlgsForStep(step: SuggestableLLStep, caseIndex: number, minMovements: number[], refPieceOrigins: number[] ): LLAlgMatch[] {
    switch (step) {
      case 'oll':
        return this.matchBothHands(this.ollAlgs, this.ollOffHandAlgs, algs => this.getValidOllAlgs(algs, caseIndex, minMovements));
      case 'pll':
        return this.matchBothHands(this.pllAlgs, this.pllOffHandAlgs, algs => this.getValidPrePostAufAlgs(algs, caseIndex, minMovements, refPieceOrigins));
      case 'zbll':
        return this.matchBothHands(this.zbllAlgs, this.zbllOffHandAlgs, algs => this.getValidPrePostAufAlgs(algs, caseIndex, minMovements, refPieceOrigins));
      case 'auf':
        return [{ moves: [...AUF_BY_CASE_INDEX[caseIndex]], frequency: 0, offHand: false }];
      default:
        throw new Error(`Unsupported step type: ${step}`);
    }
  }

  public findKnownAlgs(moves: readonly Move3x3[]): KnownLLAlgMatch[] {
    this.knownAlgsByKey ??= this.indexKnownAlgs();
    return this.knownAlgsByKey.get(knownAlgKey(moves)) ?? [];
  }

  private indexKnownAlgs(): Map<string, KnownLLAlgMatch[]> {
    const knownAlgsByKey = new Map<string, KnownLLAlgMatch[]>();
    const algsets: [CompilableLLStep, LLAlg[]][] = [['oll', this.ollAlgs], ['pll', this.pllAlgs], ['zbll', this.zbllAlgs]];

    algsets.forEach(([algset, algs]) => {
      const algsByCase = Map.groupBy(algs, ({ caseIndex }) => caseIndex);

      algs.forEach(compiledAlg => {
        const key = knownAlgKey(compiledAlg.moves);
        const match: KnownLLAlgMatch = { algset, compiledAlg, caseAlgs: algsByCase.get(compiledAlg.caseIndex) ?? [] };
        knownAlgsByKey.set(key, [...(knownAlgsByKey.get(key) ?? []), match]);
      });
    });

    return knownAlgsByKey;
  }
}