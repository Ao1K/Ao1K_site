import type { StickerColor, StickerState } from './cubeSvgRender'
import type { CubeState } from '../composables/recon/SimpleCube'

const FACELET_FACE_ORDER = ['U', 'D', 'F', 'R', 'B', 'L'] as const

const FACELET_COLORS = new Set<string>(['W', 'Y', 'R', 'O', 'G', 'B', 'X'])

export function faceletsFromState(state: CubeState): string {
  return state.map(face => face.map(line => line.join('')).join('')).join('')
}

export function stateFromFacelets(facelets: string): StickerState {
  const chars = facelets.replace(/\s+/g, '')
  if (chars.length !== 54) {
    throw new Error(`expected 54 facelets, got ${chars.length}`)
  }
  const bad = [...chars].find(c => !FACELET_COLORS.has(c))
  if (bad) throw new Error(`unknown facelet color "${bad}"`)

  return FACELET_FACE_ORDER.map((_, faceIndex) => {
    const offset = faceIndex * 9
    return [0, 1, 2].map(row => [0, 1, 2].map(col => chars[offset + row * 3 + col] as StickerColor))
  })
}
