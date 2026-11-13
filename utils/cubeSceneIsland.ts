import type { Color } from '../composables/recon/SimpleCube'
import type { CubeSvgOptions, RotationInfo } from './cubeSvgRender'
import { stateFromFacelets } from './cubeFacelets'

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
  orbit: boolean
  autoplay: boolean
}

export const SCENE_DATA_ATTR = 'data-cube-scene'
export const SCENE_MOUNTED_ATTR = 'data-cube-scene-mounted'
export const CUBE_SVG_CLASS = 'cube-svg'
export const ANNOTATION_CLASS = 'annotation'
export const ANNOTATION_SHOWN_CLASS = 'shown'
export const DEFAULT_TURN_MS = 550
export const DIM_FADE_MS = 300
export const PLAY_ICON_PATH =
  'M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z'
export const REPLAY_ICON_PATH =
  'M224 128a96 96 0 0 1-94.71 96H128a95.38 95.38 0 0 1-65.9-26.2a8 8 0 0 1 11-11.63a80 80 0 1 0-1.67-114.78a3 3 0 0 1-.26.25L44.59 96H72a8 8 0 0 1 0 16H24a8 8 0 0 1-8-8V56a8 8 0 0 1 16 0v29.8L60.25 60A96 96 0 0 1 224 128'
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
