type Color = 'W' | 'Y' | 'R' | 'O' | 'G' | 'B'
type Line = [Color, Color, Color];
type Face = [Line, Line, Line];
type CubeState = [Face, Face, Face, Face, Face, Face];
type BaseMove = 'U' | 'D' | 'F' | 'B' | 'L' | 'R' | 'u' | 'd' | 'f' | 'b' | 'l' | 'r' | 'M' | 'E' | 'S' | 'x' | 'y' | 'z';
type MoveModifier = "'" | '2' | '';
type PermissiveMoveModifier = MoveModifier | '3' | "3'" | "2'";
type Move = `${BaseMove}${MoveModifier}`;
type PermissiveMove = `${BaseMove}${PermissiveMoveModifier}`;
type StrategyType = 'START_OVER' | 'ADD' | 'UNDO';
type Strategy = { type: StrategyType, moves: Move[] };

/**
 * A simple 3x3 Rubik's Cube simulator that can apply moves and return the cube state.
 * Assumes that moves are already validated (type PermissiveMove).
 */
export class SimpleCube {

  private up: Face = [['W', 'W', 'W'], ['W', 'W', 'W'], ['W', 'W', 'W']]; // 0, x0 to face
  private down: Face = [['Y', 'Y', 'Y'], ['Y', 'Y', 'Y'], ['Y', 'Y', 'Y']]; // 1, x2 to face
  private front: Face = [['G', 'G', 'G'], ['G', 'G', 'G'], ['G', 'G', 'G']]; // 2, y0 to face
  private right: Face = [['R', 'R', 'R'], ['R', 'R', 'R'], ['R', 'R', 'R']]; // 3, y to face
  private back: Face = [['B', 'B', 'B'], ['B', 'B', 'B'], ['B', 'B', 'B']]; // 4, y2 to face
  private left: Face = [['O', 'O', 'O'], ['O', 'O', 'O'], ['O', 'O', 'O']]; // 5, y' to face
  private readonly cube: CubeState = [this.up, this.down, this.front, this.right, this.back, this.left];
  private currentMoves: Move[] = [];
  
  constructor() {}

  public getCubeState(moves: PermissiveMove[]): CubeState {
    // console.log('[SimpleCube] getCubeState called with', moves.length, 'moves:', moves);
    
    const oldMoves = this.currentMoves;

    const simplifiedMoves: Move[] = this.simplifyMoves(moves);

    const updateStrategy: Strategy = this.calcStrategy(oldMoves, simplifiedMoves);
    switch (updateStrategy.type) {
      case 'START_OVER':
        this.resetCube();
        this.addMoves(simplifiedMoves);
        break;
      case 'ADD':
        this.addMoves(updateStrategy.moves);
        break;
      case 'UNDO':
        this.undoMoves(updateStrategy.moves);
        break;
    }

    this.currentMoves = simplifiedMoves;
    // this.logCubeVisual();
    return this.cube;
  }

  private logCubeVisual(): void {
    const colorMap: Record<Color, string> = {
      'W': '⬜',
      'Y': '🟨',
      'G': '🟩',
      'R': '🟥',
      'B': '🟦',
      'O': '🟧'
    };

    const faceToString = (face: Face): string[] => {
      return face.map(line => line.map(c => colorMap[c]).join(''));
    };

    const upStr = faceToString(this.up);
    const downStr = faceToString(this.down);
    const frontStr = faceToString(this.front);
    const rightStr = faceToString(this.right);
    const backStr = faceToString(this.back);
    const leftStr = faceToString(this.left);

    console.log('\n╔════════════════════════════════════╗');
    console.log('║       CUBE STATE VISUALIZATION     ║');
    console.log('╠════════════════════════════════════╣');
    console.log(`║          ${upStr[0]}                   ║`);
    console.log(`║          ${upStr[1]}                   ║`);
    console.log(`║          ${upStr[2]}                   ║`);
    console.log(`║  ${leftStr[0]} ${frontStr[0]} ${rightStr[0]} ${backStr[0]} ║`);
    console.log(`║  ${leftStr[1]} ${frontStr[1]} ${rightStr[1]} ${backStr[1]} ║`);
    console.log(`║  ${leftStr[2]} ${frontStr[2]} ${rightStr[2]} ${backStr[2]} ║`);
    console.log(`║          ${downStr[0]}                   ║`);
    console.log(`║          ${downStr[1]}                   ║`);
    console.log(`║          ${downStr[2]}                   ║`);
    console.log('╚════════════════════════════════════╝\n');
  }

  private simplifyMoves(moves: PermissiveMove[]): Move[] {
    return moves.map((move): Move => {
      const baseMove = move[0] as BaseMove;
      const modifier = move.slice(1) as PermissiveMoveModifier;

      let normalizedModifier: MoveModifier;
      if (modifier === "3'") normalizedModifier = '';
      else if (modifier === "2'") normalizedModifier = '2';
      else if (modifier === '3') normalizedModifier = "'";
      else normalizedModifier = modifier;

      return `${baseMove}${normalizedModifier}` as Move;
    });
  }

  private calcStrategy(oldMoves: Move[], newMoves: Move[]): Strategy {
    let devisedStrategy: Strategy = { type: 'START_OVER', moves: newMoves };

    /**
     * Checks if prefix is a starting subsequence of longer
     */
    const startsWith = (longer: Move[], prefix: Move[]): boolean => {
      if (prefix.length > longer.length) return false;
      for (let i = 0; i < prefix.length; i++) {
        if (longer[i] !== prefix[i]) return false;
      }
      return true;
    };

    if (oldMoves.length === newMoves.length) {
      if (startsWith(oldMoves, newMoves)) {
        devisedStrategy = { type: 'ADD', moves: [] };
      }
    } else if (oldMoves.length < newMoves.length) {
      if (startsWith(newMoves, oldMoves)) {
        devisedStrategy = { type: 'ADD', moves: newMoves.slice(oldMoves.length) };
      }
    } else if (startsWith(oldMoves, newMoves)) {
      devisedStrategy = { type: 'UNDO', moves: oldMoves.slice(newMoves.length) };
    }

    const startOverStrategy: Strategy = { type: 'START_OVER', moves: newMoves };

    // choose the strategy that performs the least moves
    if (devisedStrategy.type !== 'START_OVER') {
      const devisedMoveCount = devisedStrategy.moves.length;
      const startOverMoveCount = newMoves.length;

      if (devisedMoveCount > startOverMoveCount) {
        return startOverStrategy;
      }
    }

    return devisedStrategy;
  }

  private resetCube(): void {
    const fillFace = (face: Face, color: Color) => {
      // mutates in place because cube keeps references to these face arrays
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          face[i][j] = color;
        }
      }
    };
    fillFace(this.up, 'W');
    fillFace(this.down, 'Y');
    fillFace(this.front, 'G');
    fillFace(this.right, 'R');
    fillFace(this.back, 'B');
    fillFace(this.left, 'O');
  }

  private addMoves(moves: Move[]): void {
    for (const move of moves) {
      this.executeMove(move);
    }
  }

  private undoMoves(moves: Move[]): void {
    // reverse moves to undo them in correct order
    const reversedMoves = moves.slice().reverse();
    
    for (const move of reversedMoves) {
      const inverseMove = this.getInverseMove(move);
      this.executeMove(inverseMove);
    }
  }

  private getInverseMove(move: Move): Move {
    const baseMove = move[0] as BaseMove;
    const modifier = move.slice(1) as MoveModifier;

    if (modifier === '2') {
      return move;
    }
    if (modifier === "'") {
      return baseMove;
    }

    return `${baseMove}'`;
  }

  private runMoves(moves: Move[]): void {
    for (const move of moves) {
      this.executeMove(move);
    }
  }

  private runMovesIntered(moves: Move[]): void {
    // does not reverse move order, assumes move components are independent
    for (const move of moves) {
      this.executeMove(this.getInverseMove(move));
    }
  }

  private executeMove(move: Move): void {
    const baseMove = move[0] as BaseMove;
    const modifier = move.slice(1) as MoveModifier;

    const runCompoundMove = (moves: Move[]): void => {
      if (modifier === '') {
        this.runMoves(moves);
        return;
      }

      if (modifier === '2') {
        this.runMoves(moves);
        this.runMoves(moves);
        return;
      }

      this.runMovesIntered(moves);
    };

    switch (baseMove) {
      case 'U':
        if (modifier === '') this.Umove();
        else if (modifier === "'") this.Uprimemove();
        else this.U2move();
        return;
      case 'D':
        if (modifier === '') this.Dmove();
        else if (modifier === "'") this.Dprimemove();
        else this.D2move();
        return;
      case 'F':
        if (modifier === '') this.Fmove();
        else if (modifier === "'") this.Fprimemove();
        else this.F2move();
        return;
      case 'B':
        if (modifier === '') this.Bmove();
        else if (modifier === "'") this.Bprimemove();
        else this.B2move();
        return;
      case 'L':
        if (modifier === '') this.Lmove();
        else if (modifier === "'") this.Lprimemove();
        else this.L2move();
        return;
      case 'R':
        if (modifier === '') this.Rmove();
        else if (modifier === "'") this.Rprimemove();
        else this.R2move();
        return;

      case 'M':
        if (modifier === '') this.Mmove();
        else if (modifier === "'") this.Mprimemove();
        else this.M2move();
        return;
      case 'E':
        if (modifier === '') this.Emove();
        else if (modifier === "'") this.Eprimemove();
        else this.E2move();
        return;
      case 'S':
        if (modifier === '') this.Smove();
        else if (modifier === "'") this.Sprimemove();
        else this.S2move();
        return;

      // wide moves
      case 'u':
        runCompoundMove(['U', "E'"]);
        return;
      case 'd':
        runCompoundMove(['D', 'E']);
        return;
      case 'f':
        runCompoundMove(['F', 'S']);
        return;
      case 'b':
        runCompoundMove(['B', "S'"]);
        return;
      case 'l':
        runCompoundMove(['L', 'M']);
        return;
      case 'r':
        runCompoundMove(['R', "M'"]);
        return;

      // cube rotations
      case 'x':
        runCompoundMove(['R', "M'", "L'"]);
        return;
      case 'y':
        runCompoundMove(['U', "E'", "D'"]);
        return;
      case 'z':
        runCompoundMove(['F', 'S', "B'"]);
        return;

      default:
        throw new Error('unsupported move: ' + move);
    }
  }

  // slice move directions follow standard notation: M like L, E like D, S like F
  private Mmove(): void {
    const temp = [this.up[0][1], this.up[1][1], this.up[2][1]];
    for (let i = 0; i < 3; i++) {
      this.up[i][1] = this.back[2 - i][1];
      this.back[2 - i][1] = this.down[i][1];
      this.down[i][1] = this.front[i][1];
      this.front[i][1] = temp[i];
    }
  }

  private Mprimemove(): void {
    const temp = [this.up[0][1], this.up[1][1], this.up[2][1]];
    for (let i = 0; i < 3; i++) {
      this.up[i][1] = this.front[i][1];
      this.front[i][1] = this.down[i][1];
      this.down[i][1] = this.back[2 - i][1];
      this.back[2 - i][1] = temp[i];
    }
  }

  private M2move(): void {
    this.swapAndFlipColumns(this.front, 1, this.back, 1);
    this.swapColumns(this.up, 1, this.down, 1);
  }

  private Emove(): void {
    [this.front[1], this.left[1], this.back[1], this.right[1]] = [this.left[1], this.back[1], this.right[1], this.front[1]];
  }

  private Eprimemove(): void {
    [this.front[1], this.right[1], this.back[1], this.left[1]] = [this.right[1], this.back[1], this.left[1], this.front[1]];
  }

  private E2move(): void {
    [this.front[1], this.back[1]] = [this.back[1], this.front[1]];
    [this.left[1], this.right[1]] = [this.right[1], this.left[1]];
  }

  private Smove(): void {
    const temp = [...this.up[1]];
    this.setColumnToRowDescending(this.left, 1, this.up, 1);
    this.setRowtoColumnAscending(this.down, 1, this.left, 1);
    this.setColumnToRowDescending(this.right, 1, this.down, 1);
    for (let i = 0; i < 3; i++) {
      this.right[i][1] = temp[i];
    }
  }

  private Sprimemove(): void {
    const temp = [...this.up[1]];
    for (let i = 0; i < 3; i++) {
      this.up[1][i] = this.right[i][1];
      this.right[i][1] = this.down[1][2 - i];
      this.down[1][2 - i] = this.left[2 - i][1];
      this.left[2 - i][1] = temp[i];
    }
  }

  private S2move(): void {
    for (let i = 0; i < 3; i++) {
      [this.up[1][i], this.down[1][2 - i]] = [this.down[1][2 - i], this.up[1][i]];
      [this.left[i][1], this.right[2 - i][1]] = [this.right[2 - i][1], this.left[i][1]];
    }
  }

  // ✓
  private Umove() {
    [this.front[0], this.right[0], this.back[0], this.left[0]] = [this.right[0], this.back[0], this.left[0], this.front[0]];
    this.rotateTargetFace90(this.up);
  }

  // ✓
  private Dmove() {
    [this.front[2], this.left[2], this.back[2], this.right[2]] = [this.left[2], this.back[2], this.right[2], this.front[2]];
    this.rotateTargetFace90(this.down);
  }

  // ✓
  private Fmove() {
    const temp = [...this.up[2]];
    this.setColumnToRowDescending(this.left, 2, this.up, 2);
    this.setRowtoColumnAscending(this.down, 0, this.left, 2);
    this.setColumnToRowDescending(this.right, 0, this.down, 0);
    for (let i = 0; i < 3; i++) {
      this.right[i][0] = temp[i];
    }

    this.rotateTargetFace90(this.front);
  }

  // ✓
  private Rmove() {
    const temp = [this.up[0][2], this.up[1][2], this.up[2][2]];
    for (let i = 0; i < 3; i++) {
      this.up[i][2] = this.front[i][2];
      this.front[i][2] = this.down[i][2];
      this.down[i][2] = this.back[2-i][0]
      this.back[2-i][0] = temp[i];
    }
    this.rotateTargetFace90(this.right);
  }

  // ✓
  private Bmove() {
    const temp = [...this.up[0]];
    this.setColumnToRowAscending(this.right, 2, this.up, 0);
    this.setRowtoColumnDescending(this.down, 2, this.right, 2);
    this.setColumnToRowAscending(this.left, 0, this.down, 2);
    for (let i = 0; i < 3; i++) {
      this.left[i][0] = temp[2-i];
    }

    this.rotateTargetFace90(this.back);
  }

  // ✓
  private Lmove() {
    const temp = [this.up[0][0], this.up[1][0], this.up[2][0]];
    for (let i = 0; i < 3; i++) {
      this.up[i][0] = this.back[2-i][2];
      this.back[2-i][2] = this.down[i][0];
      this.down[i][0] = this.front[i][0];
      this.front[i][0] = temp[i];
    }

    this.rotateTargetFace90(this.left);
  }

  // ✓
  private Uprimemove() {
    [this.front[0], this.left[0], this.back[0], this.right[0]] = [this.left[0], this.back[0], this.right[0], this.front[0]];
    this.rotateTargetFaceNegative90(this.up);
  }

  // ✓
  private Dprimemove() {
    [this.front[2], this.right[2], this.back[2], this.left[2]] = [this.right[2], this.back[2], this.left[2], this.front[2]];
    this.rotateTargetFaceNegative90(this.down);
  }

  // ✓
  private Fprimemove() {
    const temp = [...this.up[2]];
    for (let i = 0; i < 3; i++) {
      this.up[2][i] = this.right[i][0];
      this.right[i][0] = this.down[0][2-i];
      this.down[0][2-i] = this.left[2-i][2];
      this.left[2-i][2] = temp[i];
    }

    this.rotateTargetFaceNegative90(this.front);
  }

  // ✓
  private Rprimemove() {
    const temp = [this.up[0][2], this.up[1][2], this.up[2][2]];
    for (let i = 0; i < 3; i++) {
      this.up[i][2] = this.back[2-i][0];
      this.back[2-i][0] = this.down[i][2];
      this.down[i][2] = this.front[i][2];
      this.front[i][2] = temp[i];
    }

    this.rotateTargetFaceNegative90(this.right);
  }

  // ✓
  private Bprimemove() {
    const temp = [...this.up[0]];
    for (let i = 0; i < 3; i++) {
      this.up[0][i] = this.left[2-i][0];
      this.left[2-i][0] = this.down[2][2-i];
      this.down[2][2-i] = this.right[i][2]
      this.right[i][2] = temp[i];
    }
    this.rotateTargetFaceNegative90(this.back);
  }

  // ✓
  private Lprimemove() {
    const temp = [this.up[0][0], this.up[1][0], this.up[2][0]];
    for (let i = 0; i < 3; i++) {
      this.up[i][0] = this.front[i][0];
      this.front[i][0] = this.down[i][0];
      this.down[i][0] = this.back[2-i][2]
      this.back[2-i][2] = temp[i];
    }
    this.rotateTargetFaceNegative90(this.left);
  }


  private U2move() {
    [this.front[0], this.back[0]] = [this.back[0], this.front[0]];
    [this.left[0], this.right[0]] = [this.right[0], this.left[0]];
    this.rotateTargetFace180(this.up);
  }

  private D2move() {
    [this.front[2], this.back[2]] = [this.back[2], this.front[2]];
    [this.left[2], this.right[2]] = [this.right[2], this.left[2]];
    this.rotateTargetFace180(this.down);
  }

  // ✓
  private F2move() {
    for (let i = 0; i < 3; i++) {
      [this.up[2][i],this.down[0][2-i]] = [this.down[0][2-i],this.up[2][i]];
      [this.left[i][2],this.right[2-i][0]] = [this.right[2-i][0],this.left[i][2]];
    }
    this.rotateTargetFace180(this.front);
  }

  // ✓
  private R2move() {
    this.swapAndFlipColumns(this.front, 2, this.back, 0);
    this.swapColumns(this.up, 2, this.down, 2);
    this.rotateTargetFace180(this.right);
  }

  // ✓
  private B2move() {
    for (let i = 0; i < 3; i++) {
      [this.up[0][i],this.down[2][2-i]] = [this.down[2][2-i],this.up[0][i]];
      [this.left[i][0],this.right[2-i][2]] = [this.right[2-i][2],this.left[i][0]];
    }
    this.rotateTargetFace180(this.back);
  }

  // ✓
  private L2move() {
    this.swapAndFlipColumns(this.front, 0, this.back, 2);
    this.swapColumns(this.up, 0, this.down, 0);
    this.rotateTargetFace180(this.left);
  }

  private setColumnToRowAscending(colFace: Face, col: number, rowFace: Face, row: number) {
    for (let i = 0; i < 3; i++) {
      rowFace[row][i] = colFace[i][col];
    }
  }

  private setColumnToRowDescending(colFace: Face, col: number, rowFace: Face, row: number) {
    for (let i = 0; i < 3; i++) {
      rowFace[row][i] = colFace[2-i][col];
    }
  }

  private setRowtoColumnAscending(rowFace: Face, row: number, colFace: Face, col: number): void {
    for (let i = 0; i < 3; i++) {
      colFace[i][col] = rowFace[row][i];
    }
  }

  private setRowtoColumnDescending(rowFace: Face, row: number, colFace: Face, col: number): void {
    for (let i = 0; i < 3; i++) {
      colFace[i][col] = rowFace[row][2-i];
    }
  }


  private swapColumns(face1: Face, col1: number, face2: Face, col2: number): void {
    for (let i = 0; i < 3; i++) {
      const temp = face1[i][col1];
      face1[i][col1] = face2[i][col2];
      face2[i][col2] = temp;
    }
  }

  private swapAndFlipColumns(face1: Face, col1: number, face2: Face, col2: number): void {
    let j = 2;
    for (let i = 0; i < 3; i++) {
      const temp = face1[i][col1];
      face1[i][col1] = face2[j][col2];
      face2[j][col2] = temp;
      j--;
    }
  }

  private rotateTargetFace90(face: Face) {
    // Transpose the array
    for (let i = 0; i < 3; i++) {
      for (let j = i; j < 3; j++) {
        [face[i][j], face[j][i]] = [face[j][i], face[i][j]];
      }
    }
    // Reverse each row
    for (let i = 0; i < 3; i++) {
      face[i].reverse();
    }
  }

  private rotateTargetFaceNegative90(face: Face) {
    // Reverse each row
    for (let i = 0; i < 3; i++) {
      face[i].reverse();
    }
    // Transpose the array
    for (let i = 0; i < 3; i++) {
      for (let j = i; j < 3; j++) {
        [face[i][j], face[j][i]] = [face[j][i], face[i][j]];
      }
    }
  }

  private rotateTargetFace180(face: Face) {
    face.reverse();
    for (let i=0; i < 3; i++) {
      face[i].reverse();
    }
  }
}