import { SCENE_PX, type Point, type Rgba, type SceneDrawable } from './cubeSvgRender'
import type { ScenePainter } from './cubeSceneRuntime.client'

function rgbaString(color: Rgba, alpha: number): string {
  return `rgba(${color.r},${color.g},${color.b},${alpha})`
}

function traceRing(ctx: CanvasRenderingContext2D, corners: Point[]): void {
  ctx.moveTo(corners[0][0], corners[0][1])
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i][0], corners[i][1])
  ctx.closePath()
}

function drawQuad(ctx: CanvasRenderingContext2D, quad: Extract<SceneDrawable, { kind: 'quad' }>): void {
  const { outer, inner, look } = quad
  if (!inner) {
    ctx.beginPath()
    traceRing(ctx, outer)
    ctx.fillStyle = rgbaString(look.fill, look.fill.a * look.opacity)
    ctx.fill()
    return
  }
  const frameHiddenUnderFill = look.fill.a >= 1 && look.opacity >= 1

  ctx.beginPath()
  traceRing(ctx, outer)
  if (!frameHiddenUnderFill) traceRing(ctx, inner)
  ctx.fillStyle = rgbaString(look.frame, look.frame.a * look.opacity)
  ctx.fill('evenodd')

  ctx.beginPath()
  traceRing(ctx, inner)
  ctx.fillStyle = rgbaString(look.fill, look.fill.a * look.opacity)
  ctx.fill()
}

function drawLabel(ctx: CanvasRenderingContext2D, label: Extract<SceneDrawable, { kind: 'label' }>): void {
  ctx.beginPath()
  for (const { command, points } of label.segments) {
    if (command === 'M') ctx.moveTo(...points[0])
    else if (command === 'L') ctx.lineTo(...points[0])
    else if (command === 'C') ctx.bezierCurveTo(...points[0], ...points[1], ...points[2])
    else ctx.closePath()
  }
  ctx.lineJoin = 'round'
  ctx.lineWidth = label.outlineWidth
  ctx.strokeStyle = label.outline
  ctx.stroke()
  ctx.fillStyle = label.fill
  ctx.fill()
}

export function drawSceneToCanvas(ctx: CanvasRenderingContext2D, drawables: SceneDrawable[]): void {
  for (const drawable of drawables) {
    if (drawable.kind === 'quad') drawQuad(ctx, drawable)
    else drawLabel(ctx, drawable)
  }
}

export function drawSceneFitted(ctx: CanvasRenderingContext2D, drawables: SceneDrawable[], width: number, height: number): void {
  const pxPerSceneUnit = height / SCENE_PX
  const sceneLeft = (width - SCENE_PX * pxPerSceneUnit) / 2
  ctx.setTransform(pxPerSceneUnit, 0, 0, pxPerSceneUnit, sceneLeft, 0)
  drawSceneToCanvas(ctx, drawables)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

export function createCanvasPainter(canvas: HTMLCanvasElement): ScenePainter {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to create cube canvas context.')
  return drawables => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawSceneFitted(ctx, drawables, canvas.width, canvas.height)
  }
}
