/**
 * A dirt-simple class to score algorithms based on their speed.
 * Returns a meaningless number. Lower is better.
 * May be improved in the future.
 */
export default class AlgSpeedEstimator {

  private readonly speedMap: Record<string, number> = {
    // numbers are arbitrary
    "U": 1,
    "D": 1.05,
    "L": 1.05, // assume slight righty bias
    "R": 1,
    "F": 1.5,
    "B": 1.3,
    "M": 1.3,
    "E": 1.5,
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

  private readonly moveTypeWeights: Record<string, number> = {
    "": 1,
    "'": 1,
    "2": 1.6,
    "2'": 1.6,
    "3": 2.2,
    "3'": 2.2
  }

  private readonly eoRegex = new RegExp(["F", "B", "r","l", "u", "d", "f", "b", "M", "E", "S", "x", "y", "z"].join("|"));

  /**
  * naive check for moves that could theoretically change the orientation of an edge
  */
  private isEOManipulationLikely(alg: string): boolean {
    
    // fails to check for things like F2, y2, which don't change EO
    // but for the purposes of ranking f2l, possibly good enough

    return this.eoRegex.test(alg);
  }

  public calcScore(alg: string): number {
    let score = 0;

    const moves = alg.split(" ").filter(m => m.length > 0);
    const moveGenerators = new Set(); // generator is cubing lingo for types of base moves

    for (const move of moves) {
      const rootMove = move.charAt(0);
      moveGenerators.add(rootMove);
      const moveType = move.slice(1);

      const moveSpeed = this.speedMap[rootMove] || 0;
      const typeWeight = this.moveTypeWeights[moveType] || 0;
      score += moveSpeed * typeWeight;
    }

    const eoPenalty = this.isEOManipulationLikely(alg) ? 1.5 : 1;
    
    const genWeight = 1.2 ** moveGenerators.size
    // divide by ten to approximate time in seconds. Completely arbitrary.
    // round to 3 decimal places
    return Math.round((score * genWeight * eoPenalty * 1000) / 10) / 1000;
  }
}

