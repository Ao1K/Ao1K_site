import { cubeLooks, sceneDrawables, sceneGeometry, type SceneDrawable, type SceneRenderInput } from '../utils/cubeSvgRender'
import { createSvgPainter, cubiesAtTime, cubieWorld, type RuntimeCubie } from '../utils/cubeSceneRuntime.client'
import { createCanvasPainter } from '../utils/cubeCanvasRender'
import { cameraView, smootherStep, timelineMoveMs, turnRotation } from '../composables/recon/reconCube'
import { DEFAULT_SCENE_LOOK } from '../utils/cubeSceneAuthoring'
import { DEFAULT_HINT_FACELETS_ELEVATION, DEFAULT_STICKER_SCALE, DEFAULT_CAMERA_FOV } from '../utils/sharedConstants'
import { SimpleCube } from '../composables/recon/SimpleCube'
import { faceletsFromState, type RotationInfo } from '../utils/cubeMoves'

declare global {
  interface Window {
    benchCubeFrame: (frames: number, rounds: number) => Record<string, number>
  }
}

const SCRAMBLE = "U B2 D2 L2 B' D2 B U2 B' R2 B D2 F' L U L2 B2 F' U2 R U'"
const SOLUTION = "x' B' D' R F' D2 y' R' U2 R2 U R' y' R U2 R' F' L F L' U2 S L' U' L S' R D' R' U R D R' R U2 R' U2 L' U R U' R' L"
const VIEWPORT = { width: 1280, height: 720 }

type FramePose = { angles: { x: number; y: number }; cubies: RuntimeCubie[]; dim: number }

function buildFramePoses(frames: number): FramePose[] {
  const facelets = faceletsFromState(new SimpleCube().getCubeState(SCRAMBLE.split(' ')))
  const moves = SOLUTION.split(' ')
  const groups = moves.map(move => [turnRotation(move)].filter((turn): turn is RotationInfo => turn !== null))
  const durations = moves.map(timelineMoveMs)
  const totalMs = durations.reduce((sum, ms) => sum + ms, 0)

  return Array.from({ length: frames }, (_, i) => {
    const fraction = i / frames
    return {
      angles: { x: 30 * Math.cos(fraction * Math.PI * 4), y: fraction * 720 },
      cubies: cubiesAtTime(facelets, groups, durations, fraction * totalMs, smootherStep),
      dim: i % 3 === 0 ? 0.5 : 0,
    }
  })
}

function timePerFrameUs(frames: number, work: (frame: number) => void): number {
  const start = performance.now()
  for (let i = 0; i < frames; i++) work(i)
  return ((performance.now() - start) * 1000) / frames
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

window.benchCubeFrame = (frames, rounds) => {
  const poses = buildFramePoses(frames)
  const view = cameraView(VIEWPORT.height, DEFAULT_HINT_FACELETS_ELEVATION, 1, DEFAULT_STICKER_SCALE, DEFAULT_CAMERA_FOV)
  const looks = cubeLooks(DEFAULT_SCENE_LOOK.colors, DEFAULT_SCENE_LOOK.shade, DEFAULT_SCENE_LOOK.dim)
  const canvas = document.createElement('canvas')
  canvas.width = VIEWPORT.width
  canvas.height = VIEWPORT.height
  document.body.append(canvas)
  const paintCanvas = createCanvasPainter(canvas)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.append(svg)
  const paintSvg = createSvgPainter(svg)

  const poseUs: number[] = []
  const drawablesUs: number[] = []
  const canvasUs: number[] = []
  const svgUs: number[] = []
  let drawables: SceneDrawable[][] = []

  for (let round = 0; round <= rounds; round++) {
    const inputs: SceneRenderInput[] = new Array(frames)
    drawables = new Array(frames)
    const posedUs = timePerFrameUs(frames, i => {
      const { angles, cubies, dim } = poses[i]
      const geometry = sceneGeometry(angles, view)
      inputs[i] = {
        geometry,
        looks,
        showFacelets: true,
        showFaceLabels: true,
        cubies: cubies.map(c => ({ stickers: c.stickers, world: cubieWorld(geometry, c), dim })),
      }
    })
    const buildUs = timePerFrameUs(frames, i => { drawables[i] = sceneDrawables(inputs[i]) })
    const canvasPaintUs = timePerFrameUs(frames, i => paintCanvas(drawables[i]))
    const svgPaintUs = timePerFrameUs(frames, i => paintSvg(drawables[i]))
    if (round === 0) continue
    poseUs.push(posedUs)
    drawablesUs.push(buildUs)
    canvasUs.push(canvasPaintUs)
    svgUs.push(svgPaintUs)
  }

  const drawableCount = drawables.reduce((sum, list) => sum + list.length, 0) / frames
  return {
    drawablesPerFrame: drawableCount,
    poseUs: median(poseUs),
    buildDrawablesUs: median(drawablesUs),
    canvasPaintUs: median(canvasUs),
    svgPaintUs: median(svgUs),
  }
}
