import type { CubeState } from '../composables/recon/SimpleCube'
import type { CubeColors } from '../composables/useSettings'

export type Angles = { x: number; y: number }

export type CompiledLine = {
  // raw move strings, in playback order (server-side parsing filters invalid ones)
  moves: string[]
  // animation duration per move in ms (same length as moves)
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
  standalone: boolean
}

export type CompileStaticImageOptions = {
  initialState: CubeState
  angles: Angles
  cubeColors: CubeColors
  showFacelets: boolean
  showFaceLabels: boolean
  backgroundColor: string
  standalone: boolean
  // piece names to keep highlighted; null = no highlight (all bright)
  highlight: string[] | null
}
