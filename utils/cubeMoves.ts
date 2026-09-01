import type { Axis } from './cubeSvgRender'
import type { Color, CubeState, Face, Line } from '../composables/recon/SimpleCube'

export type RotationInfo = { axis: Axis; layers: number[]; angle: number }

const MOVE_TABLE: Record<string, { axis: Axis; layers: number[]; baseSign: number }> = {
  U: { axis: 'y', layers: [-1], baseSign: -1 },
  D: { axis: 'y', layers: [+1], baseSign: +1 },
  R: { axis: 'x', layers: [+1], baseSign: +1 },
  L: { axis: 'x', layers: [-1], baseSign: -1 },
  F: { axis: 'z', layers: [+1], baseSign: +1 },
  B: { axis: 'z', layers: [-1], baseSign: -1 },
  M: { axis: 'x', layers: [0], baseSign: -1 },
  E: { axis: 'y', layers: [0], baseSign: +1 },
  S: { axis: 'z', layers: [0], baseSign: +1 },
  u: { axis: 'y', layers: [-1, 0], baseSign: -1 },
  d: { axis: 'y', layers: [+1, 0], baseSign: +1 },
  r: { axis: 'x', layers: [+1, 0], baseSign: +1 },
  l: { axis: 'x', layers: [-1, 0], baseSign: -1 },
  f: { axis: 'z', layers: [+1, 0], baseSign: +1 },
  b: { axis: 'z', layers: [-1, 0], baseSign: -1 },
  x: { axis: 'x', layers: [-1, 0, +1], baseSign: +1 },
  y: { axis: 'y', layers: [-1, 0, +1], baseSign: -1 },
  z: { axis: 'z', layers: [-1, 0, +1], baseSign: +1 },
}

export function parseMoveRotation(moveStr: string): RotationInfo | null {
  if (!moveStr) return null
  const entry = MOVE_TABLE[moveStr[0]]
  if (!entry) return null
  const mod = moveStr.slice(1)
  let multiplier: number
  if (mod === '' || mod === "3'") multiplier = 1
  else if (mod === "'" || mod === '3') multiplier = -1
  else if (mod === '2' || mod === "2'") multiplier = 2
  else return null
  const angle = multiplier === 2 ? 180 : entry.baseSign * multiplier * 90
  return { axis: entry.axis, layers: entry.layers, angle }
}

export const FACELET_FACE_ORDER = ['U', 'D', 'F', 'R', 'B', 'L'] as const

const FACELET_COLORS = new Set<string>(['W', 'Y', 'R', 'O', 'G', 'B'])

export function faceletsFromState(state: CubeState): string {
  return state.map(face => face.map(line => line.join('')).join('')).join('')
}

export function stateFromFacelets(facelets: string): CubeState {
  const chars = facelets.replace(/\s+/g, '')
  if (chars.length !== 54) {
    throw new Error(`expected 54 facelets, got ${chars.length}`)
  }
  const bad = [...chars].find(c => !FACELET_COLORS.has(c))
  if (bad) throw new Error(`unknown facelet color "${bad}"`)

  const faces = FACELET_FACE_ORDER.map((_, faceIndex) => {
    const offset = faceIndex * 9
    const rows = [0, 1, 2].map(row =>
      [0, 1, 2].map(col => chars[offset + row * 3 + col] as Color) as Line)
    return rows as Face
  })
  return faces as CubeState
}
