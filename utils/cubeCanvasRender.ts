import { cornerAt, type Mat, type Rgba, type SceneDrawable } from './cubeSvgRender'

function rgbaString(color: Rgba, alpha: number): string {
  return `rgba(${color.r},${color.g},${color.b},${alpha})`
}

function traceQuad(ctx: CanvasRenderingContext2D, screen: Mat, size: number, inset: number): void {
  const lo = inset
  const hi = size - inset
  const corners = [[lo, lo], [hi, lo], [hi, hi], [lo, hi]].map(([x, y]) => cornerAt(screen, x, y))
  ctx.moveTo(corners[0][0], corners[0][1])
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i][0], corners[i][1])
  ctx.closePath()
}

function drawQuad(ctx: CanvasRenderingContext2D, quad: Extract<SceneDrawable, { kind: 'quad' }>): void {
  const { screen, size, look, border } = quad
  const frameHiddenUnderFill = look.fill.a >= 1 && look.opacity >= 1

  ctx.beginPath()
  traceQuad(ctx, screen, size, 0)
  if (!frameHiddenUnderFill) traceQuad(ctx, screen, size, border)
  ctx.fillStyle = rgbaString(look.frame, look.frame.a * look.opacity)
  ctx.fill('evenodd')

  ctx.beginPath()
  traceQuad(ctx, screen, size, border)
  ctx.fillStyle = rgbaString(look.fill, look.fill.a * look.opacity)
  ctx.fill()
}

function drawLabel(ctx: CanvasRenderingContext2D, label: Extract<SceneDrawable, { kind: 'label' }>): void {
  const glyph = new Path2D(label.path)
  ctx.lineJoin = 'round'
  ctx.lineWidth = label.outlineWidth
  ctx.strokeStyle = label.outline
  ctx.stroke(glyph)
  ctx.fillStyle = label.fill
  ctx.fill(glyph)
}

export function drawSceneToCanvas(ctx: CanvasRenderingContext2D, drawables: SceneDrawable[]): void {
  for (const drawable of drawables) {
    if (drawable.kind === 'quad') drawQuad(ctx, drawable)
    else drawLabel(ctx, drawable)
  }
}
