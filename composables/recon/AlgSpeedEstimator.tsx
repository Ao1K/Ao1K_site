/**
 * A dirt-simple class to score algorithms based on their speed.
 * Returns a meaningless number. Lower is better.
 * May be improved in the future.
 */
import type { Handedness } from '../useSettings';
import { cube3x3 } from '../../utils/parser/cube3x3';
import type { Layer3x3, Move3x3 } from '../../utils/parser/cube3x3';
import type { Amount } from '../../utils/parser';

export default class AlgSpeedEstimator {

  private readonly speedMap: Record<Layer3x3, number> = {
    // numbers are arbitrary
    "U": 1,
    "D": 1.05,
    "L": 1.05,
    "R": 1,
    "F": 1.5,
    "B": 1.3,
    "M": 1.3,
    "E": 3.0, // banished to the shadow realm
    "S": 1.4,
    "u": 1.3,
    "d": 1.3,
    "l": 1.1,
    "r": 1.1,
    "f": 1.4,
    "b": 1.4,
    "x": 1.5,
    "y": 0, // EO manipulation factor should penalize y moves enough. We actually prefer y moves over F moves during F2L.
    "z": 1.5,
  }

  private readonly moveTypeWeights: Record<Amount, number> = {
    1: 1,
    [-1]: 1,
    2: 1.6,
    [-2]: 1.6,
    3: 2.2,
    [-3]: 2.2
  }

  private readonly eoLayers: ReadonlySet<Layer3x3> = new Set<Layer3x3>(["F", "B", "r","l", "u", "d", "f", "b", "M", "E", "S", "x", "y", "z"]);

  constructor(handedness: Handedness = 'right') {
    this.setHandedness(handedness);
  }

  public setHandedness(handedness: Handedness): void {
    this.speedMap["L"] = handedness === 'right' ? 1.05 : 1;
    this.speedMap["R"] = handedness === 'right' ? 1 : 1.05;
  }

  /**
  * naive check for moves that could theoretically change the orientation of an edge
  */
  private isEOManipulationLikely(moves: readonly Move3x3[]): boolean {

    // fails to check for things like F2, y2, which don't change EO
    // but for the purposes of ranking f2l, possibly good enough

    return moves.some(move => this.eoLayers.has(cube3x3.layer(move)));
  }

  public calcScore(moves: readonly Move3x3[]): number {
    let score = 0;

    const moveGenerators = new Set<Layer3x3>(); // generator is cubing lingo for types of base moves

    for (const move of moves) {
      const layer = cube3x3.layer(move);
      moveGenerators.add(layer);

      const moveSpeed = this.speedMap[layer];
      const typeWeight = this.moveTypeWeights[cube3x3.amount(move)];
      score += moveSpeed * typeWeight;
    }

    const eoPenalty = this.isEOManipulationLikely(moves) ? 1.5 : 1;
    
    const genWeight = 1.2 ** moveGenerators.size
    // divide by ten to approximate time in seconds. Completely arbitrary.
    // round to 3 decimal places
    return Math.round((score * genWeight * eoPenalty * 1000) / 10) / 1000;
  }
}

