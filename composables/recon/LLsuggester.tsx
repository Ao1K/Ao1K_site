import compiledOll from '@/public/recon/compiled-oll-algs.json';
import compiledPll from '@/public/recon/compiled-pll-algs.json';

export interface CompiledLLAlg {
  caseIndex: number;
  alg: string;
  refPieceMovement: number; // the number of clockwise 90 degree turns of effective green-white piece to go from front-right to starting position of alg
  minMovements: number[]; // the number of clockwise 90 degree turns to go from starting position to the minimum key position
  frequency?: number; // how often this alg is used in competition solves
}

export default class LLsuggester {
  private ollAlgs: CompiledLLAlg[] = [];
  private pllAlgs: CompiledLLAlg[] = [];

  constructor() {
    this.ollAlgs = (compiledOll as any).algorithms as CompiledLLAlg[];
    this.pllAlgs = (compiledPll as any).algorithms as CompiledLLAlg[];
  }

  /**
   * @param alg
   * @param caseMovementsToMin 
   * @param refPieceOrigin 
   * @returns 
   */
  private calcPreAUF(alg: CompiledLLAlg, caseMovementsToMin: number[], refPieceOrigin: number): number {
    let preAUFidx = 4; // Initialize to max+1
    
    // iterate through minMovements to find the preferred preAUFidx
    // Preference order: 0 (no AUF), 1 (U), 3 (U'), 2 (U2)
    const aufPreference = [0, 1, 3, 2];
    
    let candidateIdx = 0;
    caseMovementsToMin.forEach(caseMove => {
      
      const algMovementsToMin = alg.minMovements
      
      algMovementsToMin.forEach(algMove => {
        
        candidateIdx = (4 + algMove - caseMove) % 4;

        const currentPref = aufPreference.indexOf(preAUFidx);
        const candidatePref = aufPreference.indexOf(candidateIdx);
        if (currentPref === -1 || candidatePref < currentPref) {
          preAUFidx = candidateIdx;
        }
      });
    });

    return preAUFidx;                          
  }

  private calcPostAUF(preAUFidx: number, alg: CompiledLLAlg, refPieceOrigins: number[]): number {

    const targetOrigin = (4 + alg.refPieceMovement - preAUFidx) % 4;
    const refPieceOrigin = refPieceOrigins.findIndex(origin => origin === targetOrigin);

    return (4 - refPieceOrigin) % 4;
  }

  private getValidOllAlgs(caseIndex: number, minMovements: number[], refPieceOrigins: number[]): { alg: string, frequency: number }[] {
    const validAlgs: { alg: string, frequency: number }[] = [];
    this.ollAlgs.forEach(alg => {
      if (alg.caseIndex !== caseIndex) {
        return;
      }

      const preAUFidx = this.calcPreAUF(alg, minMovements, refPieceOrigins[0]);

      let preAUF = '';
      switch (preAUFidx) {
        case 0: preAUF = ''; break;
        case 1: preAUF = 'U '; break;
        case 2: preAUF = 'U2 '; break;
        case 3: preAUF = "U' "; break;
      }
      
      validAlgs.push({ alg: preAUF + alg.alg, frequency: alg.frequency ?? 0 });
    });
    return validAlgs;
  }

  private fixPostAUFrotation(alg: string): string {
    // If alg ends with rotation, remove it
    const rotationRegex = / (x|y|z)[2']?$/;
    if (rotationRegex.test(alg)) {
      return alg.replace(rotationRegex, '');
    }
    
    // If an alg ends with x U*, we should adjust to just end the alg with
    const xAUFRegex = /x (U2|U'|U)$/;
    const match = alg.match(xAUFRegex);
    if (match) {
      const aufPart = match[1];
      let replacement = aufPart.replace('U', 'F')
      return alg.replace(xAUFRegex, replacement);
    }
    return alg;
  }

  private getValidPllAlgs(caseIndex: number, minMovements: number[], refPieceOrigins: number[]): { alg: string, frequency: number }[] {
    const validAlgs: { alg: string, frequency: number }[] = [];
    const aufCost = [0, 1, 2, 1]; // none, U, U2, U'
    const aufPreference = [0, 1, 3, 2]; // tiebreaker: prefer no AUF, then U, U', U2

    this.pllAlgs.forEach(alg => {
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

          const totalCost = aufCost[preAUFidx] + aufCost[postAUFidx];
          const prePref = aufPreference.indexOf(preAUFidx);

          if (totalCost < bestCost || (totalCost === bestCost && prePref < bestPrePref)) {
            bestPreAUF = preAUFidx;
            bestPostAUF = postAUFidx;
            bestCost = totalCost;
            bestPrePref = prePref;
          }
        });
      });

      let preAUF = '';
      switch (bestPreAUF) {
        case 0: preAUF = ''; break;
        case 1: preAUF = 'U '; break;
        case 2: preAUF = 'U2 '; break;
        case 3: preAUF = "U' "; break;
      }
      
      let postAUF = '';
      switch (bestPostAUF) {
        case 0: postAUF = ''; break;
        case 1: postAUF = ' U'; break;
        case 2: postAUF = ' U2'; break;
        case 3: postAUF = " U'"; break;
      }
      const fullAlg = preAUF + alg.alg + postAUF;
      const finalAUFadjustedAlg = this.fixPostAUFrotation(fullAlg);
      validAlgs.push({ alg: finalAUFadjustedAlg, frequency: alg.frequency ?? 0 });
    });
    return validAlgs;
  }

  public getAlgsForStep(step: 'oll' | 'pll' | 'auf', caseIndex: number, minMovements: number[], refPieceOrigins: number[] ): { alg: string, frequency: number }[] {
    switch (step) {
      case 'oll':
        return this.getValidOllAlgs(caseIndex, minMovements, refPieceOrigins);
      case 'pll':
        return this.getValidPllAlgs(caseIndex, minMovements, refPieceOrigins);
      case 'auf':
        const aufAlgs = ["", "U'", "U2", "U"];
        return [{ alg: aufAlgs[caseIndex], frequency: 0 }];
      default:
        throw new Error(`Unsupported step type: ${step}`);
    }
  }

  
}