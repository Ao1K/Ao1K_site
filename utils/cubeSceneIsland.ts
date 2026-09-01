import type { Color } from '../composables/recon/SimpleCube'
import type { CubeSvgOptions } from './cubeSvgRender'
import { stateFromFacelets, type RotationInfo } from './cubeMoves'

export type SceneLine = {
  moves: RotationInfo[][]
  durations: number[]
  delay: number
  highlight: string[] | null
}

export type SceneIsland = {
  facelets: string
  angles: { x: number; y: number }
  colors: Record<Color, string>
  shade: string
  dim: number
  hints: boolean
  labels: boolean
  lines: SceneLine[]
  loop: boolean
  progress: boolean
  startHighlighted: boolean
}

export const SCENE_DATA_ATTR = 'data-cube-scene'
export const CUBE_SVG_CLASS = 'cube-svg'
export const DEFAULT_TURN_MS = 550
export const DIM_FADE_MS = 300
export const CYCLE_PAUSE_END_MS = 1000
export const CYCLE_PAUSE_START_MS = 600

export function restHighlight(island: SceneIsland): string[] | null {
  return island.startHighlighted && island.lines.length ? island.lines[0].highlight : null
}

export function islandFrameZero(island: SceneIsland): CubeSvgOptions {
  return {
    state: stateFromFacelets(island.facelets),
    angles: island.angles,
    colorHex: island.colors,
    showFacelets: island.hints,
    showFaceLabels: island.labels,
    shadeColor: island.shade,
    dimOpacity: island.dim,
    highlight: restHighlight(island),
  }
}
