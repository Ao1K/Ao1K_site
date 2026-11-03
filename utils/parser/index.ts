import { cube3x3 } from './cube3x3'
import type { Layer3x3, Move3x3, Rotation3x3 } from './cube3x3'

export type PuzzleId = '3x3'

type PuzzleMoves = { '3x3': Move3x3 }
type PuzzleLayers = { '3x3': Layer3x3 }
type PuzzleRotations = { '3x3': Rotation3x3 }

export type Move<P extends PuzzleId> = PuzzleMoves[P]
export type Layer<P extends PuzzleId> = PuzzleLayers[P]
export type Rotation<P extends PuzzleId> = PuzzleRotations[P]

export type Amount = 1 | 2 | 3 | -1 | -2 | -3

// Refer to https://www.speedsolving.com/wiki/index.php/Metric
export type Metric = 'htm' | 'qtm' | 'stm' | 'etm'

export type ParseResult<M> = { moves: M[]; invalid: string[] }

export type InputRule = { pattern: RegExp; replacement: string }

export interface Parser<M extends string, L extends string> {
  readonly puzzle: PuzzleId
  readonly inputRules: readonly InputRule[]
  parse(text: string): ParseResult<M>
  parseTrusted(text: string): M[]
  parseMove(token: string): M | null
  format(moves: readonly M[]): string
  layer(move: M): L
  amount(move: M): Amount
  turns(move: M): 1 | 2 | 3
  make(layer: L, amount: Amount): M
  invert(moves: readonly M[]): M[]
  combine(moves: readonly M[]): M[]
  normalize(moves: readonly M[]): M[]
  count(moves: readonly M[], metric: Metric): number
}

export type Axis = 'x' | 'y' | 'z'
export type Geometry = { axis: Axis; layers: readonly number[]; sign: 1 | -1 }

export interface CubeParser<M extends string, L extends string, R extends M> extends Parser<M, L> {
  geometry(move: M): Geometry
  isRotation(move: M): move is R
  mirror(moves: readonly M[], plane: 'M' | 'S' | 'E'): M[]
  rotate(moves: readonly M[], rotation: R): M[]
  simplifyRotations(rotations: readonly R[]): R[]
}

const PARSERS: { [P in PuzzleId]: CubeParser<Move<P>, Layer<P>, Rotation<P>> } = {
  '3x3': cube3x3,
}

export function getParser<P extends PuzzleId>(puzzle: P): CubeParser<Move<P>, Layer<P>, Rotation<P>> {
  return PARSERS[puzzle]
}
