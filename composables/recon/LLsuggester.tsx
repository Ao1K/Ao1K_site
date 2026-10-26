import type { CompilableLLStep, SuggestableLLStep } from './LLinterpreter';
import { addPostAuf } from '../algs/algMoves';

export interface CompiledLLAlg {
  caseIndex: number;
  alg: string;
  refPieceMovement: number; // the number of clockwise 90 degree turns of effective green-white piece to go from front-right to starting position of alg
  minMovements: number[]; // the number of clockwise 90 degree turns to go from starting position to the minimum key position
  frequency?: number; // how often this alg is used in competition solves
}

const AUF_PREFIX = ['', 'U ', 'U2 ', "U' "];
const POST_AUF = ['', 'U', 'U2', "U'"] as const;
const AUF_COST = [0, 1, 2, 1]; // none, U, U2, U'
const AUF_PREFERENCE = [0, 1, 3, 2]; // tiebreaker: prefer no AUF, then U, U', U2

type ValidAlg = { alg: string, frequency: number };

export type LLAlgMatch = ValidAlg & { offHand: boolean };

export default class LLsuggester {
  private ollAlgs: CompiledLLAlg[] = [];
  private pllAlgs: CompiledLLAlg[] = [];
  private zbllAlgs: CompiledLLAlg[] = [];
  private ollOffHandAlgs: CompiledLLAlg[] = [];
  private pllOffHandAlgs: CompiledLLAlg[] = [];
  private zbllOffHandAlgs: CompiledLLAlg[] = [];

  public addAlgs(step: CompilableLLStep, algs: CompiledLLAlg[]): void {
    if (step === 'oll') {
      this.ollAlgs = algs;
    } else if (step === 'pll') {
      this.pllAlgs = algs;
    } else if (step === 'zbll') {
      this.zbllAlgs = algs;
    }
  }

  public addOffHandAlgs(step: CompilableLLStep, algs: CompiledLLAlg[]): void {
    if (step === 'oll') {
      this.ollOffHandAlgs = algs;
    } else if (step === 'pll') {
      this.pllOffHandAlgs = algs;
    } else if (step === 'zbll') {
      this.zbllOffHandAlgs = algs;
    }
  }

  private calcPreAUF(alg: CompiledLLAlg, caseMovementsToMin: number[]): number {
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

  private calcPostAUF(preAUFidx: number, alg: CompiledLLAlg, refPieceOrigins: number[]): number {

    const targetOrigin = (4 + alg.refPieceMovement - preAUFidx) % 4;
    const refPieceOrigin = refPieceOrigins.findIndex(origin => origin === targetOrigin);

    return (4 - refPieceOrigin) % 4;
  }

  private getValidOllAlgs(algs: CompiledLLAlg[], caseIndex: number, minMovements: number[]): ValidAlg[] {
    const validAlgs: ValidAlg[] = [];
    algs.forEach(alg => {
      if (alg.caseIndex !== caseIndex) {
        return;
      }

      const preAUFidx = this.calcPreAUF(alg, minMovements);

      validAlgs.push({ alg: AUF_PREFIX[preAUFidx] + alg.alg, frequency: alg.frequency ?? 0 });
    });
    return validAlgs;
  }

  private getValidPrePostAufAlgs(algs: CompiledLLAlg[], caseIndex: number, minMovements: number[], refPieceOrigins: number[]): ValidAlg[] {
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

      const fullAlg = addPostAuf(AUF_PREFIX[bestPreAUF] + alg.alg, POST_AUF[bestPostAUF]);
      validAlgs.push({ alg: fullAlg, frequency: alg.frequency ?? 0 });
    });
    return validAlgs;
  }

  private matchBothHands(inHand: CompiledLLAlg[], offHand: CompiledLLAlg[], getValidAlgs: (algs: CompiledLLAlg[]) => ValidAlg[]): LLAlgMatch[] {
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
        const aufAlgs = ["", "U'", "U2", "U"];
        return [{ alg: aufAlgs[caseIndex], frequency: 0, offHand: false }];
      default:
        throw new Error(`Unsupported step type: ${step}`);
    }
  }

  
}