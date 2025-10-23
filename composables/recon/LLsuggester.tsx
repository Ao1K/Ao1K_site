import compiledOll from '../../utils/compiled-oll-algs.json';
import compiledPll from '../../utils/compiled-pll-algs.json';

export interface CompiledLLAlg {
  caseIndex: number;
  alg: string;
  refPieceMovement: number; // the number of clockwise 90 degree turns of effective green-white piece to go from front-right to starting position of alg
  minMovements: number[]; // the number of clockwise 90 degree turns to go from starting position to the minimum key position
}

export default class LLsuggester {
  private ollAlgs: CompiledLLAlg[] = [];
  private pllAlgs: CompiledLLAlg[] = [];

  constructor() {
    this.ollAlgs = (compiledOll as any).algorithms as CompiledLLAlg[];
    this.pllAlgs = (compiledPll as any).algorithms as CompiledLLAlg[];
  }

  /**
   * Iterate through
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

  private getValidOllAlgs(caseIndex: number, minMovements: number[], refPieceOrigins: number[]): string[] {
    const validAlgs: string[] = [];
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
      
      validAlgs.push(preAUF + alg.alg);
    });
    return validAlgs;
  }

  private getValidPllAlgs(caseIndex: number, minMovements: number[], refPieceOrigins: number[]): string[] {
    const validAlgs: string[] = [];
    this.pllAlgs.forEach(alg => {
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
      
      const postAUFidx = this.calcPostAUF(preAUFidx, alg, refPieceOrigins);
      let postAUF = '';
      switch (postAUFidx) {
        case 0: postAUF = ''; break;
        case 1: postAUF = ' U'; break;
        case 2: postAUF = ' U2'; break;
        case 3: postAUF = " U'"; break;
      }
      validAlgs.push(preAUF + alg.alg + postAUF)
    });
    return validAlgs;
  }

  public getAlgsForStep(step: 'oll' | 'pll' | 'auf', caseIndex: number, minMovements: number[], refPieceOrigins: number[] ): string[] {
    switch (step) {
      case 'oll':
        return this.getValidOllAlgs(caseIndex, minMovements, refPieceOrigins);
      case 'pll':
        return this.getValidPllAlgs(caseIndex, minMovements, refPieceOrigins);
      case 'auf':
        const aufAlgs = ["", "U'", "U2", "U"];
        return [aufAlgs[caseIndex]];
      default:
        throw new Error(`Unsupported step type: ${step}`);
    }
  }

  
}