import type { CompilableLLStep, SuggestableLLStep } from './LLinterpreter';

export interface CompiledLLAlg {
  caseIndex: number;
  alg: string;
  refPieceMovement: number; // the number of clockwise 90 degree turns of effective green-white piece to go from front-right to starting position of alg
  minMovements: number[]; // the number of clockwise 90 degree turns to go from starting position to the minimum key position
  frequency?: number; // how often this alg is used in competition solves
}

const AUF_PREFIX = ['', 'U ', 'U2 ', "U' "];
const AUF_SUFFIX = ['', ' U', ' U2', " U'"];
const AUF_COST = [0, 1, 2, 1]; // none, U, U2, U'
const AUF_PREFERENCE = [0, 1, 3, 2]; // tiebreaker: prefer no AUF, then U, U', U2

const ROTATION_AUF_FACE: Record<string, string> = {
  x: 'F',
  "x'": 'B',
  x2: 'D',
  z: 'L',
  "z'": 'R',
  z2: 'D',
};

export default class LLsuggester {
  private ollAlgs: CompiledLLAlg[] = [];
  private pllAlgs: CompiledLLAlg[] = [];
  private zbllAlgs: CompiledLLAlg[] = [];

  public addAlgs(step: CompilableLLStep, algs: CompiledLLAlg[]): void {
    if (step === 'oll') {
      this.ollAlgs = algs;
    } else if (step === 'pll') {
      this.pllAlgs = algs;
    } else if (step === 'zbll') {
      this.zbllAlgs = algs;
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

  private getValidOllAlgs(caseIndex: number, minMovements: number[]): { alg: string, frequency: number }[] {
    const validAlgs: { alg: string, frequency: number }[] = [];
    this.ollAlgs.forEach(alg => {
      if (alg.caseIndex !== caseIndex) {
        return;
      }

      const preAUFidx = this.calcPreAUF(alg, minMovements);

      validAlgs.push({ alg: AUF_PREFIX[preAUFidx] + alg.alg, frequency: alg.frequency ?? 0 });
    });
    return validAlgs;
  }

  private fixPostAUFrotation(alg: string): string {
    const trailingRotationsRegex = /( [xyz](?:'|2|2')?)+$/;
    if (trailingRotationsRegex.test(alg)) {
      return alg.replace(trailingRotationsRegex, '');
    }

    const rotationAUFregex = / ([xyz](?:'|2|2')?) (U2|U'|U)$/;
    let fixed = alg;
    let match = fixed.match(rotationAUFregex);
    while (match) {
      const rotation = match[1].replace("2'", '2');
      const auf = match[2];
      fixed = fixed.replace(rotationAUFregex, ' ' + auf.replace('U', ROTATION_AUF_FACE[rotation] ?? 'U'));
      match = fixed.match(rotationAUFregex);
    }

    return fixed;
  }

  private getValidPrePostAufAlgs(caseIndex: number, minMovements: number[], refPieceOrigins: number[], algset: 'pll' | 'zbll'): { alg: string, frequency: number }[] {
    const validAlgs: { alg: string, frequency: number }[] = [];
    const algs = algset === 'pll' ? this.pllAlgs : this.zbllAlgs;

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

      const fullAlg = AUF_PREFIX[bestPreAUF] + alg.alg + AUF_SUFFIX[bestPostAUF];
      validAlgs.push({ alg: this.fixPostAUFrotation(fullAlg), frequency: alg.frequency ?? 0 });
    });
    return validAlgs;
  }

  public getAlgsForStep(step: SuggestableLLStep, caseIndex: number, minMovements: number[], refPieceOrigins: number[] ): { alg: string, frequency: number }[] {
    switch (step) {
      case 'oll':
        return this.getValidOllAlgs(caseIndex, minMovements);
      case 'pll':
        return this.getValidPrePostAufAlgs(caseIndex, minMovements, refPieceOrigins, 'pll');
      case 'zbll':
        return this.getValidPrePostAufAlgs(caseIndex, minMovements, refPieceOrigins, 'zbll');
      case 'auf':
        const aufAlgs = ["", "U'", "U2", "U"];
        return [{ alg: aufAlgs[caseIndex], frequency: 0 }];
      default:
        throw new Error(`Unsupported step type: ${step}`);
    }
  }

  
}