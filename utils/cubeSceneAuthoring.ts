import type { Color } from '../composables/recon/SimpleCube'
import { SimpleCube } from '../composables/recon/SimpleCube'
import { DEFAULT_CUBE_COLORS, type CubeColors } from './sharedConstants'
import { faceletsFromState } from './cubeFacelets'
import type { RotationInfo } from './cubeSvgRender'
import { DEFAULT_TURN_MS, type SceneIsland, type SceneLine } from './cubeSceneIsland'
import { cube3x3, type Move3x3 } from './parser/cube3x3'
import { turnRotation } from '../composables/recon/reconCube'

export function buildColorHex(c: CubeColors): Record<Color, string> {
  return { W: c.up, Y: c.down, G: c.front, R: c.right, B: c.back, O: c.left }
}

export const DEFAULT_SCENE_LOOK = {
  angles: { x: 30, y: 30 },
  colors: buildColorHex(DEFAULT_CUBE_COLORS),
  shade: '#000000b3',
  dim: 0.6,
}

export type AuthoredLine = {
  moves: (Move3x3 | Move3x3[])[]
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
  orbit?: boolean
}

export function parseScramble(scramble: string): Move3x3[] {
  const { moves, invalid } = cube3x3.parse(scramble)
  if (invalid.length > 0) throw new Error(`invalid scramble moves: ${invalid.join(', ')} in "${scramble}"`)
  return moves
}

function faceletsOf(scene: AuthoredScene): string {
  if (scene.facelets) return scene.facelets
  return faceletsFromState(new SimpleCube().getCubeState(parseScramble(scene.scramble ?? '')))
}

export function buildSceneIsland(scene: AuthoredScene): SceneIsland {
  const lines: SceneLine[] = (scene.lines ?? []).map(line => {
    const moves: RotationInfo[][] = []
    const durations: number[] = []
    line.moves.forEach((entry, i) => {
      const group = (Array.isArray(entry) ? entry : [entry]).map(turnRotation)
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
    orbit: scene.orbit ?? false,
  }
}
