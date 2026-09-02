import type { CubeState } from '../composables/recon/SimpleCube'
import type { CubeColors } from '../utils/cubeColors'

export type Angles = { x: number; y: number }

export type CompiledLine = {
  // raw move strings in playback order, grouped into turns played at the same time
  // (server-side parsing filters invalid ones)
  moveGroups: string[][]
  // animation duration per group in ms (same length as moveGroups)
  moveDurationsMs: number[]
  // pause (ms) before this line's moves begin to play
  delayMs: number
  // piece names to keep highlighted during this line; null = no highlight (all bright)
  highlight: string[] | null
}

export type CompileSceneOptions = {
  initialState: CubeState
  lines: CompiledLine[]
  angles: Angles
  cubeColors: CubeColors
  showProgressBar: boolean
  showFacelets: boolean
  showFaceLabels: boolean
  loopPlayback: boolean
  backgroundColor: string
  // color (with alpha) used to shade unhighlighted pieces
  shadeColor: string
  dimOpacity: number
  // start the cube already showing the first line's highlight instead of all-bright
  startHighlighted: boolean
  standalone: boolean
}

export type CompileStaticImageOptions = {
  initialState: CubeState
  angles: Angles
  cubeColors: CubeColors
  showFacelets: boolean
  showFaceLabels: boolean
  backgroundColor: string
  // color (with alpha) used to shade unhighlighted pieces
  shadeColor: string
  dimOpacity: number
  standalone: boolean
  // piece names to keep highlighted; null = no highlight (all bright)
  highlight: string[] | null
}
