import type { Color } from '../composables/recon/SimpleCube'
import { LABEL_GLYPH_BOX, LABEL_GLYPHS } from './cubeLabelGlyphs'

export const CUBIE_PX = 100
export const CUBE_PX = CUBIE_PX * 3
export const SCENE_PX = 640
const LABEL_WIDTH = CUBIE_PX * 1.1
const LABEL_HEIGHT = CUBIE_PX * 1.6
const LABEL_FILL = '#ECE6EF'
const LABEL_OUTLINE = '#161018'
const LABEL_OUTLINE_GLYPH_UNITS = 32
export const FACE_BORDER_PX = 3

const HINT_INSET = 3
export const HINT_PX = CUBIE_PX - HINT_INSET * 2

const LABEL_OFFSET = 50 // distance (px) face direction labels float outside the cube
const HALF_CUBIE = CUBIE_PX / 2
const CUBE_MID = CUBE_PX / 2
const CUBE_LEFT = (SCENE_PX - CUBE_PX) / 2
const LABEL_FLOAT = CUBE_MID + LABEL_OFFSET
const HINT_OPACITY = 0.55

export type SceneView = { hintElevation: number; cubeScale: number; perspective: number }

export const DEFAULT_SCENE_VIEW: SceneView = { hintElevation: 1.5, cubeScale: 0.85, perspective: 1000 }

export type Mat = number[]

export function mul(a: Mat, b: Mat): Mat {
  const out: Mat = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let row = 0; row < 16; row += 4) {
    for (let c = 0; c < 4; c++) {
      out[row + c] = a[row] * b[c] + a[row + 1] * b[4 + c] + a[row + 2] * b[8 + c] + a[row + 3] * b[12 + c]
    }
  }
  return out
}

function chain(...mats: Mat[]): Mat {
  return mats.reduce(mul, [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ])
}

export function translate(x: number, y: number, z: number): Mat {
  return [
    1, 0, 0, x,
    0, 1, 0, y,
    0, 0, 1, z,
    0, 0, 0, 1,
  ]
}

function scaleXY(s: number): Mat {
  return [
    s, 0, 0, 0,
    0, s, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
}

function rotateX(deg: number): Mat {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    0, 0, 0, 1,
  ]
}

function rotateY(deg: number): Mat {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1,
  ]
}

function rotateZ(deg: number): Mat {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [
    c, -s, 0, 0,
    s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
}

export type Axis = 'x' | 'y' | 'z'

export function axisRotation(axis: Axis, deg: number): Mat {
  if (axis === 'x') return rotateX(deg)
  if (axis === 'y') return rotateY(deg)
  return rotateZ(deg)
}

export function cubeRotation(axis: Axis, deg: number): Mat {
  return aboutOrigin(CUBE_MID, CUBE_MID, axisRotation(axis, deg))
}

function perspective(d: number): Mat {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -1 / d, 1,
  ]
}

function aboutOrigin(ox: number, oy: number, m: Mat): Mat {
  return chain(translate(ox, oy, 0), m, translate(-ox, -oy, 0))
}

export function apply(m: Mat, x: number, y: number, z: number) {
  return {
    x: m[0] * x + m[1] * y + m[2] * z + m[3],
    y: m[4] * x + m[5] * y + m[6] * z + m[7],
    z: m[8] * x + m[9] * y + m[10] * z + m[11],
    w: m[12] * x + m[13] * y + m[14] * z + m[15],
  }
}

export type Rgba = { r: number; g: number; b: number; a: number }

const OPAQUE_BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 }

function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value.trim())
  if (hex) {
    let h = hex[1]
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('')
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    }
  }
  const parts = value.replace(/^rgba?\(|\)$/g, '').split(',').map(Number)
  return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts.length > 3 ? parts[3] : 1 }
}

function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a)
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a }
}

const COORD_STEPS = 10

function snap(n: number): number {
  return Math.round(n * COORD_STEPS) / COORD_STEPS
}

function coord(n: number): string {
  const text = snap(n).toString()
  if (text.startsWith('0.')) return text.slice(1)
  if (text.startsWith('-0.')) return '-' + text.slice(2)
  return text
}

function joinCoords(values: number[]): string {
  let out = ''
  let previous = ''
  values.forEach((value, index) => {
    const text = coord(value)
    const selfDelimiting = text[0] === '-' || (text[0] === '.' && previous.includes('.'))
    if (index > 0 && !selfDelimiting) out += ' '
    out += text
    previous = text
  })
  return out
}

function ratio(n: number): string {
  return (Math.round(n * 10000) / 10000).toString()
}

const FACE_NAMES = ['up', 'down', 'front', 'right', 'back', 'left'] as const

type FaceName = (typeof FACE_NAMES)[number]

export type StickerColor = Color | 'X'
export type StickerState = StickerColor[][][]

const BLANK_STICKER_HEX = '#888888'

export const COLOR_ORDER: StickerColor[] = ['W', 'Y', 'G', 'R', 'B', 'O', 'X']

const FACE_ORIENT: Record<FaceName, Mat> = {
  up: chain(rotateX(90), translate(0, 0, HALF_CUBIE)),
  down: chain(rotateX(-90), translate(0, 0, HALF_CUBIE)),
  front: translate(0, 0, HALF_CUBIE),
  back: chain(rotateY(180), translate(0, 0, HALF_CUBIE)),
  right: chain(rotateY(90), translate(0, 0, HALF_CUBIE)),
  left: chain(rotateY(-90), translate(0, 0, HALF_CUBIE)),
}

function hintOrient(hintFloat: number): Record<FaceName, Mat> {
  return {
    up: chain(rotateX(-90), translate(0, 0, -hintFloat)),
    down: chain(rotateX(90), translate(0, 0, -hintFloat)),
    front: chain(rotateY(180), translate(0, 0, -hintFloat)),
    back: translate(0, 0, -hintFloat),
    right: chain(rotateY(-90), translate(0, 0, -hintFloat)),
    left: chain(rotateY(90), translate(0, 0, -hintFloat)),
  }
}

const LABEL_ORIENT: Record<string, Mat> = {
  U: chain(translate(0, -LABEL_FLOAT, 0), rotateX(90)),
  D: chain(translate(0, LABEL_FLOAT, 0), rotateX(-90)),
  R: chain(translate(LABEL_FLOAT, 0, 0), rotateY(90)),
  L: chain(translate(-LABEL_FLOAT, 0, 0), rotateY(-90)),
  F: translate(0, 0, LABEL_FLOAT),
  B: chain(translate(0, 0, -LABEL_FLOAT), rotateY(180)),
}

export type Point = [number, number]

export type GlyphSegment = { command: 'M' | 'L' | 'C' | 'Z'; points: Point[] }

function parseGlyph(d: string): GlyphSegment[] {
  const tokens = d.match(/[A-Za-z]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) ?? []
  const scaleX = LABEL_WIDTH / LABEL_GLYPH_BOX.width
  const scaleY = LABEL_HEIGHT / LABEL_GLYPH_BOX.height
  const segments: GlyphSegment[] = []
  let index = 0
  let command = ''
  let x = 0
  let y = 0
  const read = () => Number(tokens[index++])
  const point = (px: number, py: number): Point => [px * scaleX, py * scaleY]

  while (index < tokens.length) {
    if (/[A-Za-z]/.test(tokens[index])) command = tokens[index++]
    if (command === 'Z') {
      segments.push({ command: 'Z', points: [] })
    } else if (command === 'M' || command === 'L') {
      x = read()
      y = read()
      segments.push({ command, points: [point(x, y)] })
      command = 'L'
    } else if (command === 'H') {
      x = read()
      segments.push({ command: 'L', points: [point(x, y)] })
    } else if (command === 'V') {
      y = read()
      segments.push({ command: 'L', points: [point(x, y)] })
    } else if (command === 'C') {
      const c1 = point(read(), read())
      const c2 = point(read(), read())
      x = read()
      y = read()
      segments.push({ command: 'C', points: [c1, c2, point(x, y)] })
    } else {
      throw new Error(`unsupported label glyph command "${command}"`)
    }
  }
  return segments
}

const LABEL_GLYPH_SEGMENTS: Record<string, GlyphSegment[]> = Object.fromEntries(
  Object.entries(LABEL_GLYPHS).map(([letter, d]) => [letter, parseGlyph(d)]),
)

function pieceNameOf(colors: StickerColor[]): string {
  const primary = colors.includes('W') ? 'W' : colors.includes('Y') ? 'Y' : ''
  const rest = colors.filter(c => c !== 'W' && c !== 'Y').slice().sort().join('')
  return primary + rest
}

export type Sticker = { faceIndex: number; facelet: number; color: StickerColor }
export type Cubie = { x: number; y: number; z: number; piece: string; stickers: Sticker[] }

export function cubiesFromState(state: StickerState): Cubie[] {
  const cubies: Cubie[] = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue
        const slots: Array<[number, number]> = []
        if (y === -1) slots.push([0, (z + 1) * 3 + x + 1])
        if (y === 1) slots.push([1, (1 - z) * 3 + x + 1])
        if (z === 1) slots.push([2, (y + 1) * 3 + x + 1])
        if (x === 1) slots.push([3, (y + 1) * 3 + 1 - z])
        if (z === -1) slots.push([4, (y + 1) * 3 + 1 - x])
        if (x === -1) slots.push([5, (y + 1) * 3 + z + 1])

        const stickers = slots.map(([faceIndex, stickerIdx]) => ({
          faceIndex,
          facelet: faceIndex * 9 + stickerIdx,
          color: state[faceIndex][Math.floor(stickerIdx / 3)][stickerIdx % 3],
        }))
        cubies.push({ x, y, z, piece: pieceNameOf(stickers.map(s => s.color)), stickers })
      }
    }
  }
  return cubies
}

export type Look = { frame: Rgba; fill: Rgba; opacity: number }
export type LookPair = { bright: Look; dim: Look }

type StickerLooks = { face: LookPair; hint: LookPair }

export type CubeLooks = { face: LookPair[]; hint: LookPair[]; painted: Map<number, StickerLooks> }

function stickerLooks(color: Rgba, shade: Rgba, dimOpacity: number, hintOpacity: number): StickerLooks {
  const dimColor = over(shade, color)
  return {
    face: {
      bright: { frame: OPAQUE_BLACK, fill: color, opacity: 1 },
      dim: { frame: OPAQUE_BLACK, fill: dimColor, opacity: dimOpacity },
    },
    hint: {
      bright: { frame: color, fill: color, opacity: hintOpacity },
      dim: { frame: dimColor, fill: dimColor, opacity: hintOpacity * dimOpacity },
    },
  }
}

export function cubeLooks(
  colorHex: Record<Color, string>,
  shadeColor: string,
  dimOpacity: number,
  paints: ReadonlyMap<number, string> = new Map(),
  hintOpacity = HINT_OPACITY,
): CubeLooks {
  const shade = parseColor(shadeColor)
  const byColor = COLOR_ORDER.map(name =>
    stickerLooks(parseColor(name === 'X' ? BLANK_STICKER_HEX : colorHex[name]), shade, dimOpacity, hintOpacity))

  const looksByPaint = new Map<string, StickerLooks>()
  const painted = new Map<number, StickerLooks>()
  paints.forEach((paint, facelet) => {
    let looks = looksByPaint.get(paint)
    if (!looks) {
      looks = stickerLooks(parseColor(paint), shade, dimOpacity, hintOpacity)
      looksByPaint.set(paint, looks)
    }
    painted.set(facelet, looks)
  })

  return { face: byColor.map(l => l.face), hint: byColor.map(l => l.hint), painted }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

function lerpRgba(from: Rgba, to: Rgba, t: number): Rgba {
  return { r: lerp(from.r, to.r, t), g: lerp(from.g, to.g, t), b: lerp(from.b, to.b, t), a: lerp(from.a, to.a, t) }
}

export function lerpLook(pair: LookPair, t: number): Look {
  return {
    frame: lerpRgba(pair.bright.frame, pair.dim.frame, t),
    fill: lerpRgba(pair.bright.fill, pair.dim.fill, t),
    opacity: lerp(pair.bright.opacity, pair.dim.opacity, t),
  }
}

export function cubiePlacement(x: number, y: number, z: number): Mat {
  return translate(CUBIE_PX + x * CUBIE_PX, CUBIE_PX + y * CUBIE_PX, z * CUBIE_PX)
}

export type SceneGeometry = {
  projection: Mat
  placement: Mat
  faceLocal: Mat[]
  hintLocal: Mat[]
  labels: Array<{ letter: string; matrix: Mat }>
}

export function sceneGeometry(angles: { x: number; y: number }, view: SceneView = DEFAULT_SCENE_VIEW): SceneGeometry {
  const labelInsetX = (CUBE_PX - LABEL_WIDTH) / 2
  const labelInsetY = (CUBE_PX - LABEL_HEIGHT) / 2
  const hintOrientByFace = hintOrient(view.hintElevation * CUBIE_PX)
  return {
    projection: aboutOrigin(SCENE_PX / 2, SCENE_PX / 2, perspective(view.perspective)),
    placement: chain(
      translate(CUBE_LEFT, CUBE_LEFT, 0),
      aboutOrigin(CUBE_MID, CUBE_MID, chain(scaleXY(view.cubeScale), rotateX(-angles.x), rotateY(-angles.y))),
    ),
    faceLocal: FACE_NAMES.map(name => aboutOrigin(HALF_CUBIE, HALF_CUBIE, FACE_ORIENT[name])),
    hintLocal: FACE_NAMES.map(name =>
      chain(translate(HINT_INSET, HINT_INSET, 0), aboutOrigin(HINT_PX / 2, HINT_PX / 2, hintOrientByFace[name]))),
    labels: Object.entries(LABEL_ORIENT).map(([face, orient]) => ({
      letter: face,
      matrix: chain(aboutOrigin(CUBE_MID, CUBE_MID, orient), translate(labelInsetX, labelInsetY, 0)),
    })),
  }
}

export function cornerAt(screen: Mat, x: number, y: number): Point {
  const q = apply(screen, x, y, 0)
  return [q.x / q.w, q.y / q.w]
}

function projectRect(screen: Mat, lo: number, hiX: number, hiY: number): { corners: Point[]; nearestW: number } {
  let nearestW = Infinity
  const rect: Point[] = [[lo, lo], [hiX, lo], [hiX, hiY], [lo, hiY]]
  const corners = rect.map(([x, y]): Point => {
    const q = apply(screen, x, y, 0)
    nearestW = Math.min(nearestW, q.w)
    return [q.x / q.w, q.y / q.w]
  })
  return { corners, nearestW }
}

function ringPath(corners: Point[]): string {
  const points = corners.map(corner => corner.map(snap))
  const steps: number[] = []
  for (let i = 1; i < points.length; i++) {
    steps.push(snap(points[i][0] - points[i - 1][0]), snap(points[i][1] - points[i - 1][1]))
  }
  return `M${joinCoords(points[0])}l${joinCoords(steps)}Z`
}

// stands in for Three.js near-plane clipping. High hint elevation or screenshot zoom can put a quad behind the camera, where it would draw inverted.
const NEAR_PLANE_W = 0.05

function facesCamera([origin, alongX, , alongY]: Point[]): boolean {
  return (alongX[0] - origin[0]) * (alongY[1] - origin[1]) - (alongX[1] - origin[1]) * (alongY[0] - origin[0]) > 0
}

function rgbString(c: Rgba): string {
  return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`
}

function opacityAttrs(value: number): PathAttrs {
  return value >= 1 ? {} : { opacity: ratio(value) }
}

export type PathAttrs = Record<string, string>

export type DrawablePaths = { groupOpacity: string | null; paths: PathAttrs[] }

function quadPaths(outerCorners: Point[], innerCorners: Point[] | null, look: Look): DrawablePaths {
  const groupOpacity = look.opacity >= 1 ? null : ratio(look.opacity)
  const outer = ringPath(outerCorners)
  if (!innerCorners) {
    return { groupOpacity, paths: [{ d: outer, fill: rgbString(look.fill), ...opacityAttrs(look.fill.a) }] }
  }
  const inner = ringPath(innerCorners)
  const fillHidesFrameCenter = look.fill.a >= 1
  const framePath: PathAttrs = fillHidesFrameCenter
    ? { d: outer, fill: rgbString(look.frame), ...opacityAttrs(look.frame.a) }
    : { d: outer + inner, 'fill-rule': 'evenodd', fill: rgbString(look.frame), ...opacityAttrs(look.frame.a) }
  const fillPath: PathAttrs = { d: inner, fill: rgbString(look.fill), ...opacityAttrs(look.fill.a) }
  return { groupOpacity, paths: [framePath, fillPath] }
}

function labelGlyphSegments(screen: Mat, letter: string): GlyphSegment[] {
  return LABEL_GLYPH_SEGMENTS[letter].map(segment => ({
    command: segment.command,
    points: segment.points.map(([x, y]) => cornerAt(screen, x, y)),
  }))
}

function labelOutlineWidth(screen: Mat): number {
  const left = cornerAt(screen, 0, LABEL_HEIGHT / 2)
  const right = cornerAt(screen, LABEL_WIDTH, LABEL_HEIGHT / 2)
  const top = cornerAt(screen, LABEL_WIDTH / 2, 0)
  const bottom = cornerAt(screen, LABEL_WIDTH / 2, LABEL_HEIGHT)
  const xAxis = [(right[0] - left[0]) / LABEL_WIDTH, (right[1] - left[1]) / LABEL_WIDTH]
  const yAxis = [(bottom[0] - top[0]) / LABEL_HEIGHT, (bottom[1] - top[1]) / LABEL_HEIGHT]
  const screenScale = Math.sqrt(Math.abs(xAxis[0] * yAxis[1] - xAxis[1] * yAxis[0]))
  const glyphUnitPx = Math.sqrt((LABEL_WIDTH / LABEL_GLYPH_BOX.width) * (LABEL_HEIGHT / LABEL_GLYPH_BOX.height))
  return LABEL_OUTLINE_GLYPH_UNITS * glyphUnitPx * screenScale
}

export function drawablePaths(drawable: SceneDrawable): DrawablePaths {
  if (drawable.kind === 'quad') return quadPaths(drawable.outer, drawable.inner, drawable.look)
  const labelPath: PathAttrs = {
    d: drawable.segments.map(segment => segment.command + joinCoords(segment.points.flat())).join(''),
    fill: drawable.fill,
    stroke: drawable.outline,
    'stroke-width': ratio(drawable.outlineWidth),
    'paint-order': 'stroke',
    'stroke-linejoin': 'round',
  }
  return { groupOpacity: null, paths: [labelPath] }
}

function drawableMarkup(drawable: SceneDrawable): string {
  const { groupOpacity, paths } = drawablePaths(drawable)
  const body = paths
    .map(attrs => `<path${Object.entries(attrs).map(([name, value]) => ` ${name}="${value}"`).join('')}></path>`)
    .join('')
  return groupOpacity === null ? body : `<g opacity="${groupOpacity}">${body}</g>`
}

function svgDocument(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_PX} ${SCENE_PX}"`
    + ` width="${SCENE_PX}" height="${SCENE_PX}" style="display:block">${body}</svg>`
}

export type SceneDrawable =
  | { kind: 'quad'; depth: number; outer: Point[]; inner: Point[] | null; look: Look; facelet: number | null }
  | { kind: 'label'; depth: number; segments: GlyphSegment[]; outlineWidth: number; fill: string; outline: string }

export type CubeSvgOptions = {
  state: StickerState
  angles: { x: number; y: number }
  colorHex: Record<Color, string>
  showFacelets: boolean
  showFaceLabels: boolean
  shadeColor: string
  dimOpacity: number
  highlight: string[] | null
}

export function buildCubeSvg(opts: CubeSvgOptions): string {
  return svgDocument(buildCubeSvgBody(opts))
}

export function buildCubeSvgBody(opts: CubeSvgOptions): string {
  const { state, angles, colorHex, showFacelets, showFaceLabels, shadeColor, dimOpacity, highlight } = opts

  const geometry = sceneGeometry(angles)
  const highlightSet = highlight ? new Set(highlight) : null
  const cubies: PosedCubie[] = cubiesFromState(state).map(cubie => ({
    stickers: cubie.stickers,
    world: restingWorld(geometry, cubie),
    dim: highlightSet !== null && !highlightSet.has(cubie.piece) ? 1 : 0,
  }))

  return renderSceneMarkup({
    geometry,
    looks: cubeLooks(colorHex, shadeColor, dimOpacity),
    showFacelets,
    showFaceLabels,
    cubies,
  })
}

export function restingWorld(geometry: SceneGeometry, cubie: Pick<Cubie, 'x' | 'y' | 'z'>): Mat {
  return mul(geometry.placement, cubiePlacement(cubie.x, cubie.y, cubie.z))
}

export type PosedCubie = { stickers: Sticker[]; world: Mat; dim: number }

export type SceneRenderInput = {
  geometry: SceneGeometry
  looks: CubeLooks
  showFacelets: boolean
  showFaceLabels: boolean
  cubies: PosedCubie[]
}

export function renderSceneMarkup(input: SceneRenderInput): string {
  return sceneDrawables(input).map(drawableMarkup).join('')
}

export function sceneDrawables(input: SceneRenderInput): SceneDrawable[] {
  const { geometry, looks, showFacelets, showFaceLabels, cubies } = input
  const drawables: SceneDrawable[] = []

  const addQuad = (world: Mat, size: number, look: Look, border: number | null, cull: boolean, facelet: number | null) => {
    const screen = mul(geometry.projection, world)
    const { corners: outer, nearestW } = projectRect(screen, 0, size, size)
    if (nearestW < NEAR_PLANE_W) return
    if (cull && !facesCamera(outer)) return
    const inner = border === null ? null : projectRect(screen, border, size - border, size - border).corners
    drawables.push({ kind: 'quad', depth: apply(world, size / 2, size / 2, 0).z, outer, inner, look, facelet })
  }

  cubies.forEach(cubie => {
    cubie.stickers.forEach(sticker => {
      const colorIndex = COLOR_ORDER.indexOf(sticker.color)
      const painted = looks.painted.get(sticker.facelet)
      // stickers skip backface culling so a highlighted piece on the far side is still drawn
      // and shows through the translucent dimmed pieces in front of it. Hints can't: they
      // float one sticker outside the cube, so an unculled near-side hint would sit between
      // the camera and the cube.
      addQuad(mul(cubie.world, geometry.faceLocal[sticker.faceIndex]), CUBIE_PX,
        lerpLook(painted?.face ?? looks.face[colorIndex], cubie.dim), FACE_BORDER_PX, false, sticker.facelet)
      if (!showFacelets) return
      addQuad(mul(cubie.world, geometry.hintLocal[sticker.faceIndex]), HINT_PX,
        lerpLook(painted?.hint ?? looks.hint[colorIndex], cubie.dim), null, true, null)
    })
  })

  if (showFaceLabels) {
    geometry.labels.forEach(label => {
      const world = mul(geometry.placement, label.matrix)
      const screen = mul(geometry.projection, world)
      const { corners, nearestW } = projectRect(screen, 0, LABEL_WIDTH, LABEL_HEIGHT)
      if (nearestW < NEAR_PLANE_W || !facesCamera(corners)) return
      drawables.push({
        kind: 'label',
        depth: apply(world, LABEL_WIDTH / 2, LABEL_HEIGHT / 2, 0).z,
        segments: labelGlyphSegments(screen, label.letter),
        outlineWidth: labelOutlineWidth(screen),
        fill: LABEL_FILL,
        outline: LABEL_OUTLINE,
      })
    })
  }

  return drawables.sort((a, b) => a.depth - b.depth)
}
