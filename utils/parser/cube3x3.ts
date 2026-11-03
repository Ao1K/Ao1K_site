import type { Amount, Axis, CubeParser, Geometry, InputRule, Metric, ParseResult } from './index'

export type FaceLayer3x3 = 'U' | 'D' | 'R' | 'L' | 'F' | 'B'
export type WideLayer3x3 = 'u' | 'd' | 'r' | 'l' | 'f' | 'b'
export type TurnLayer3x3 = FaceLayer3x3 | WideLayer3x3
export type SliceLayer3x3 = 'M' | 'E' | 'S'
export type RotationLayer3x3 = 'x' | 'y' | 'z'
export type SliceOrRotation3x3 = SliceLayer3x3 | RotationLayer3x3
export type Layer3x3 = TurnLayer3x3 | SliceOrRotation3x3

type TurnSuffix = '' | "'" | '2' | "2'" | '3' | "3'"
type SliceSuffix = '' | "'" | '2' | "2'"

export type Move3x3 = `${TurnLayer3x3}${TurnSuffix}` | `${SliceOrRotation3x3}${SliceSuffix}`
export type Rotation3x3 = `${RotationLayer3x3}${SliceSuffix}`
export type MirrorPlane3x3 = 'M' | 'S' | 'E'

type Matrix = readonly (readonly number[])[]

export const GEOMETRY_3X3: Readonly<Record<Layer3x3, Geometry>> = {
  U: { axis: 'y', layers: [-1], sign: -1 },
  D: { axis: 'y', layers: [+1], sign: +1 },
  R: { axis: 'x', layers: [+1], sign: +1 },
  L: { axis: 'x', layers: [-1], sign: -1 },
  F: { axis: 'z', layers: [+1], sign: +1 },
  B: { axis: 'z', layers: [-1], sign: -1 },
  M: { axis: 'x', layers: [0], sign: -1 },
  E: { axis: 'y', layers: [0], sign: +1 },
  S: { axis: 'z', layers: [0], sign: +1 },
  u: { axis: 'y', layers: [-1, 0], sign: -1 },
  d: { axis: 'y', layers: [+1, 0], sign: +1 },
  r: { axis: 'x', layers: [+1, 0], sign: +1 },
  l: { axis: 'x', layers: [-1, 0], sign: -1 },
  f: { axis: 'z', layers: [+1, 0], sign: +1 },
  b: { axis: 'z', layers: [-1, 0], sign: -1 },
  x: { axis: 'x', layers: [-1, 0, +1], sign: +1 },
  y: { axis: 'y', layers: [-1, 0, +1], sign: -1 },
  z: { axis: 'z', layers: [-1, 0, +1], sign: +1 },
}

const FACE_LAYERS: readonly FaceLayer3x3[] = ['U', 'D', 'R', 'L', 'F', 'B']
const TURN_LAYERS: readonly TurnLayer3x3[] = [...FACE_LAYERS, 'u', 'd', 'r', 'l', 'f', 'b']
const SLICE_LAYERS: readonly SliceLayer3x3[] = ['M', 'E', 'S']
const ROTATION_LAYERS: readonly RotationLayer3x3[] = ['x', 'y', 'z']
const AXES: readonly Axis[] = ['x', 'y', 'z']

const AMOUNT_BY_SUFFIX: Readonly<Record<TurnSuffix, Amount>> = {
  '': 1, "'": -1, '2': 2, "2'": -2, '3': 3, "3'": -3,
}
const SUFFIX_BY_AMOUNT: Readonly<Record<Amount, TurnSuffix>> = {
  1: '', [-1]: "'", 2: '2', [-2]: "2'", 3: '3', [-3]: "3'",
}
const TURN_SUFFIXES: readonly TurnSuffix[] = ['', "'", '2', "2'", '3', "3'"]
const SLICE_SUFFIXES: readonly SliceSuffix[] = ['', "'", '2', "2'"]

const ROTATION_LAYER_SET = new Set<string>(ROTATION_LAYERS)
const SLICE_LAYER_SET = new Set<string>(SLICE_LAYERS)

export const MOVES_3X3: readonly Move3x3[] = [
  ...TURN_LAYERS.flatMap(layer => TURN_SUFFIXES.map(suffix => `${layer}${suffix}` as Move3x3)),
  ...[...SLICE_LAYERS, ...ROTATION_LAYERS].flatMap(layer => SLICE_SUFFIXES.map(suffix => `${layer}${suffix}` as Move3x3)),
]

export const ROTATIONS_3X3 = MOVES_3X3.filter(move => ROTATION_LAYER_SET.has(move[0])) as readonly Rotation3x3[]

const MOVE_BY_TEXT = new Map<string, Move3x3>(MOVES_3X3.map(move => [move, move]))

function layerOf(move: Move3x3): Layer3x3 {
  return move[0] as Layer3x3
}

function amountOf(move: Move3x3): Amount {
  return AMOUNT_BY_SUFFIX[move.slice(1) as TurnSuffix]
}

function turnsOf(move: Move3x3): 1 | 2 | 3 {
  return (((amountOf(move) % 4) + 4) % 4) as 1 | 2 | 3
}

function makeMove(layer: Layer3x3, amount: Amount): Move3x3 {
  const allowsTriple = !ROTATION_LAYER_SET.has(layer) && !SLICE_LAYER_SET.has(layer)
  const writtenAmount = allowsTriple || Math.abs(amount) !== 3 ? amount : (-Math.sign(amount) as Amount)
  return MOVE_BY_TEXT.get(`${layer}${SUFFIX_BY_AMOUNT[writtenAmount]}`)!
}

const ALIAS_BY_TEXT = new Map<string, Move3x3>(
  FACE_LAYERS.flatMap(face =>
    TURN_SUFFIXES.map(suffix => [
      `${face}w${suffix}`,
      makeMove(face.toLowerCase() as WideLayer3x3, AMOUNT_BY_SUFFIX[suffix]),
    ] as const),
  ),
)

const LAYER_BY_GEOMETRY = new Map<string, Layer3x3>(
  (Object.keys(GEOMETRY_3X3) as Layer3x3[]).map(layer => {
    const { axis, layers } = GEOMETRY_3X3[layer]
    return [`${axis}:${[...layers].sort().join(',')}`, layer]
  }),
)

function axisRotationMatrix(axis: Axis, quarterTurns: number): Matrix {
  const quarter = ((quarterTurns % 4) + 4) % 4
  const cos = [1, 0, -1, 0][quarter]
  const sin = [0, 1, 0, -1][quarter]
  const i = AXES.indexOf(axis)
  const j = (i + 1) % 3
  const k = (i + 2) % 3
  const matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  matrix[i][i] = 1
  matrix[j][j] = cos
  matrix[j][k] = -sin
  matrix[k][j] = sin
  matrix[k][k] = cos
  return matrix
}

function multiply(a: Matrix, b: Matrix): Matrix {
  return [0, 1, 2]
    .map(row => [0, 1, 2]
      .map(col => a[row][0] * b[0][col] + a[row][1] * b[1][col] + a[row][2] * b[2][col]))
}

function rotationMatrixOf(rotation: Rotation3x3): Matrix {
  const { axis, sign } = GEOMETRY_3X3[layerOf(rotation)]
  return axisRotationMatrix(axis, sign * amountOf(rotation))
}

function transformMove(move: Move3x3, matrix: Matrix, determinant: 1 | -1): Move3x3 {
  const { axis, layers, sign } = GEOMETRY_3X3[layerOf(move)]
  const fromAxis = AXES.indexOf(axis)
  const toAxis = [0, 1, 2].find(row => matrix[row][fromAxis] !== 0)!
  const axisSign = matrix[toAxis][fromAxis]
  const movedLayers = layers.map(layer => layer * axisSign).sort()
  const target = LAYER_BY_GEOMETRY.get(`${AXES[toAxis]}:${movedLayers.join(',')}`)!
  const amount = amountOf(move)
  const isRotatedHalfTurn = determinant === 1 && Math.abs(amount) === 2
  const directionFactor = isRotatedHalfTurn ? 1 : determinant * sign * axisSign * GEOMETRY_3X3[target].sign
  return makeMove(target, (amount * directionFactor) as Amount)
}

function buildTable(matrix: Matrix, determinant: 1 | -1): Readonly<Record<Move3x3, Move3x3>> {
  return Object.fromEntries(MOVES_3X3.map(move => [move, transformMove(move, matrix, determinant)])) as Record<Move3x3, Move3x3>
}

export const INVERT_3X3 = Object.fromEntries(
  MOVES_3X3.map(move => [move, makeMove(layerOf(move), -amountOf(move) as Amount)]),
) as Readonly<Record<Move3x3, Move3x3>>

const MIRROR_MATRICES: Readonly<Record<MirrorPlane3x3, Matrix>> = {
  M: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
  E: [[1, 0, 0], [0, -1, 0], [0, 0, 1]],
  S: [[1, 0, 0], [0, 1, 0], [0, 0, -1]],
}

export const MIRROR_3X3: Readonly<Record<MirrorPlane3x3, Readonly<Record<Move3x3, Move3x3>>>> = {
  M: buildTable(MIRROR_MATRICES.M, -1),
  E: buildTable(MIRROR_MATRICES.E, -1),
  S: buildTable(MIRROR_MATRICES.S, -1),
}

export const ROTATE_3X3 = Object.fromEntries(
  ROTATIONS_3X3.map(rotation => [rotation, buildTable(rotationMatrixOf(rotation), 1)]),
) as Readonly<Record<Rotation3x3, Readonly<Record<Move3x3, Move3x3>>>>

const IDENTITY: Matrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
const orientationKey = (matrix: Matrix) => matrix.flat().join(',')

function buildRotationSearch(firstLayer: RotationLayer3x3): ReadonlyMap<string, readonly Rotation3x3[]> {
  const layerOrder = [firstLayer, ...ROTATION_LAYERS.filter(layer => layer !== firstLayer)]
  const candidates = layerOrder.flatMap(layer => [layer, `${layer}'`, `${layer}2`] as Rotation3x3[])
  const search = new Map<string, readonly Rotation3x3[]>([[orientationKey(IDENTITY), []]])
  for (const rotation of candidates) {
    const key = orientationKey(rotationMatrixOf(rotation))
    if (!search.has(key)) search.set(key, [rotation])
  }
  for (const first of candidates) {
    for (const second of candidates) {
      const key = orientationKey(multiply(rotationMatrixOf(second), rotationMatrixOf(first)))
      if (!search.has(key)) search.set(key, [first, second])
    }
  }
  return search
}

export const ROTATION_GROUP_3X3: Readonly<Record<RotationLayer3x3, ReadonlyMap<string, readonly Rotation3x3[]>>> = {
  x: buildRotationSearch('x'),
  y: buildRotationSearch('y'),
  z: buildRotationSearch('z'),
}

const LAYER_LETTERS = 'UDFBLRMESudfblrxyz'

export const INPUT_RULES_3X3: readonly InputRule[] = [
  { pattern: /X/g, replacement: 'x' },
  { pattern: /Y/g, replacement: 'y' },
  { pattern: /Z/g, replacement: 'z' },
  { pattern: new RegExp(`([${LAYER_LETTERS}])(?!\\s)\\1`, 'g'), replacement: '$12' },
  { pattern: /([LRlr])2(?!\s)\1/g, replacement: '$13' },
  { pattern: /([UD])([23])('?)([DU])/g, replacement: '$1$2$3 $4' },
  { pattern: /([UD])('?)([DU][23])/g, replacement: '$1$2 $3' },
  { pattern: /U('?)(?!2)D('?)(?!2)\s/g, replacement: '(U$1 D$2) ' },
  { pattern: /D('?)(?!2)U('?)(?!2)\s/g, replacement: '(U$2 D$1) ' },
  ...FACE_LAYERS.map(face => ({
    pattern: new RegExp(`${face}[wW]`, 'g'),
    replacement: face.toLowerCase(),
  })),
  {
    pattern: new RegExp(`(?!U[23]?'?D|D[23]?'?U)([${LAYER_LETTERS}])([23]?)('?)([${LAYER_LETTERS}])`, 'g'),
    replacement: '$1$2$3 $4',
  },
]

function countMove(move: Move3x3, metric: Metric): number {
  const layer = layerOf(move)
  if (metric === 'etm') return 1
  if (ROTATION_LAYER_SET.has(layer)) return 0
  if (metric === 'stm') return 1
  const sliceFactor = SLICE_LAYER_SET.has(layer) ? 2 : 1
  const quarterTurns = metric === 'qtm' && turnsOf(move) === 2 ? 2 : 1
  return sliceFactor * quarterTurns
}

function parseMove(token: string): Move3x3 | null {
  return MOVE_BY_TEXT.get(token) ?? ALIAS_BY_TEXT.get(token) ?? null
}

export const cube3x3: CubeParser<Move3x3, Layer3x3, Rotation3x3> = {
  puzzle: '3x3',
  inputRules: INPUT_RULES_3X3,

  parse(text: string): ParseResult<Move3x3> {
    const result: ParseResult<Move3x3> = { moves: [], invalid: [] }
    for (const token of text.split(/\s+/)) {
      if (!token) continue
      const move = parseMove(token)
      if (move) result.moves.push(move)
      else result.invalid.push(token)
    }
    return result
  },

  parseTrusted(text: string): Move3x3[] {
    return text
      .split(/\s+/)
      .filter(Boolean)
      .map(token => MOVE_BY_TEXT.get(token) ?? (token as Move3x3))
  },

  parseMove,

  format(moves: readonly Move3x3[]): string {
    return moves.join(' ')
  },

  layer: layerOf,
  amount: amountOf,
  turns: turnsOf,
  make: makeMove,

  invert(moves: readonly Move3x3[]): Move3x3[] {
    return moves.map(move => INVERT_3X3[move]).reverse()
  },

  combine(moves: readonly Move3x3[]): Move3x3[] {
    const stack: Move3x3[] = []
    for (const move of moves) {
      const last = stack[stack.length - 1]
      if (last === undefined || layerOf(last) !== layerOf(move)) {
        stack.push(move)
        continue
      }
      const totalTurns = (turnsOf(last) + turnsOf(move)) % 4
      if (totalTurns === 0) stack.pop()
      else stack[stack.length - 1] = makeMove(layerOf(move), totalTurns === 3 ? -1 : (totalTurns as Amount))
    }
    return stack
  },

  normalize(moves: readonly Move3x3[]): Move3x3[] {
    return moves.map(move => {
      const turns = turnsOf(move)
      return makeMove(layerOf(move), turns === 3 ? -1 : turns)
    })
  },

  count(moves: readonly Move3x3[], metric: Metric): number {
    return moves.reduce((total, move) => total + countMove(move, metric), 0)
  },

  geometry(move: Move3x3): Geometry {
    return GEOMETRY_3X3[layerOf(move)]
  },

  isRotation(move: Move3x3): move is Rotation3x3 {
    return ROTATION_LAYER_SET.has(layerOf(move))
  },

  mirror(moves: readonly Move3x3[], plane: MirrorPlane3x3): Move3x3[] {
    const table = MIRROR_3X3[plane]
    return moves.map(move => table[move])
  },

  rotate(moves: readonly Move3x3[], rotation: Rotation3x3): Move3x3[] {
    const table = ROTATE_3X3[rotation]
    return moves.map(move => table[move])
  },

  simplifyRotations(rotations: readonly Rotation3x3[]): Rotation3x3[] {
    if (rotations.length === 0) return []
    const orientation = rotations.reduce(
      (total, rotation) => multiply(rotationMatrixOf(rotation), total),
      IDENTITY,
    )
    const search = ROTATION_GROUP_3X3[layerOf(rotations[0]) as RotationLayer3x3]
    return [...search.get(orientationKey(orientation))!]
  },
}
