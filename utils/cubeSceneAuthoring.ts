import type { Color } from '../composables/recon/SimpleCube'
import { SimpleCube } from '../composables/recon/SimpleCube'
import { DEFAULT_CUBE_COLORS, type CubeColors } from './cubeColors'
import { faceletsFromState, parseMoveRotation, type RotationInfo } from './cubeMoves'
import { DEFAULT_TURN_MS, type SceneIsland, type SceneLine } from './cubeSceneIsland'

export function buildColorHex(c: CubeColors): Record<Color, string> {
  return { W: c.up, Y: c.down, G: c.front, R: c.right, B: c.back, O: c.left }
}

export const DEFAULT_SCENE_LOOK = {
  angles: { x: 30, y: 30 },
  colors: buildColorHex(DEFAULT_CUBE_COLORS),
  shade: '#000000b3',
  dim: 0.6,
}

export type SceneMove = string | string[]

export type AuthoredLine = {
  moves: SceneMove[]
  durations?: number[]
  delay?: number
  highlight?: string[] | null
}

export type AuthoredScene = {
  scramble?: string
  facelets?: string
  angles?: { x: number; y: number }
  colors?: Record<Color, string>
  shade?: string
  dim?: number
  hints?: boolean
  labels?: boolean
  lines?: AuthoredLine[]
  loop?: boolean
  progress?: boolean
  startHighlighted?: boolean
}

function faceletsOf(scene: AuthoredScene): string {
  if (scene.facelets) return scene.facelets
  const moves = (scene.scramble ?? '').trim().split(/\s+/).filter(Boolean)
  return faceletsFromState(new SimpleCube().getCubeState(moves))
}

export function buildSceneIsland(scene: AuthoredScene): SceneIsland {
  const lines: SceneLine[] = (scene.lines ?? []).map(line => {
    const moves: RotationInfo[][] = []
    const durations: number[] = []
    line.moves.forEach((entry, i) => {
      const group = (Array.isArray(entry) ? entry : [entry])
        .map(parseMoveRotation)
        .filter((r): r is RotationInfo => r !== null)
      if (group.length === 0) return
      moves.push(group)
      durations.push(line.durations?.[i] ?? DEFAULT_TURN_MS)
    })
    return { moves, durations, delay: line.delay ?? 0, highlight: line.highlight ?? null }
  })

  return {
    facelets: faceletsOf(scene),
    angles: scene.angles ?? DEFAULT_SCENE_LOOK.angles,
    colors: scene.colors ?? DEFAULT_SCENE_LOOK.colors,
    shade: scene.shade ?? DEFAULT_SCENE_LOOK.shade,
    dim: scene.dim ?? DEFAULT_SCENE_LOOK.dim,
    hints: scene.hints ?? false,
    labels: scene.labels ?? false,
    lines,
    loop: scene.loop ?? false,
    progress: scene.progress ?? false,
    startHighlighted: scene.startHighlighted ?? false,
  }
}
