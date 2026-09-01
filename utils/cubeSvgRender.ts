import type { Color, CubeState } from '../composables/recon/SimpleCube'

export const CUBIE_PX = 100
export const CUBE_PX = CUBIE_PX * 3
export const SCENE_PX = 640
export const LABEL_SIZE = Math.round(CUBIE_PX * 1.5) // face label container size (50% larger than a sticker)
export const FACE_BORDER_PX = 3
export const HINT_BORDER_PX = 2

const HINT_INSET = 3
export const HINT_PX = CUBIE_PX - HINT_INSET * 2

const HINT_OFFSET = CUBIE_PX // distance (px) hint facelets float outside the regular sticker (~1 sticker)
const LABEL_OFFSET = 50 // distance (px) face direction labels float outside the cube
const HALF_CUBIE = CUBIE_PX / 2
const CUBE_MID = CUBE_PX / 2
const CUBE_LEFT = (SCENE_PX - CUBE_PX) / 2
const CUBE_SCALE = 0.85
const PERSPECTIVE_PX = 1000
const HINT_FLOAT = HALF_CUBIE + HINT_OFFSET
const LABEL_FLOAT = CUBE_MID + LABEL_OFFSET
const HINT_OPACITY = 0.55

type Mat = number[][]

function mul(a: Mat, b: Mat): Mat {
  const out: Mat = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c] + a[r][3] * b[3][c]
    }
  }
  return out
}

function chain(...mats: Mat[]): Mat {
  return mats.reduce(mul, [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])
}

function translate(x: number, y: number, z: number): Mat {
  return [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]]
}

function scaleXY(s: number): Mat {
  return [[s, 0, 0, 0], [0, s, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
}

function rotateX(deg: number): Mat {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]]
}

function rotateY(deg: number): Mat {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]]
}

function perspective(d: number): Mat {
  return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, -1 / d, 1]]
}

function aboutOrigin(ox: number, oy: number, m: Mat): Mat {
  return chain(translate(ox, oy, 0), m, translate(-ox, -oy, 0))
}

function apply(m: Mat, x: number, y: number, z: number) {
  return {
    x: m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3],
    y: m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3],
    z: m[2][0] * x + m[2][1] * y + m[2][2] * z + m[2][3],
    w: m[3][0] * x + m[3][1] * y + m[3][2] * z + m[3][3],
  }
}

type Rgba = { r: number; g: number; b: number; a: number }

const OPAQUE_BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 }
const HINT_BORDER: Rgba = { r: 0, g: 0, b: 0, a: 0.25 }

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

export const COLOR_ORDER: Color[] = ['W', 'Y', 'G', 'R', 'B', 'O']

const FACE_ORIENT: Record<FaceName, Mat> = {
  up: chain(rotateX(90), translate(0, 0, HALF_CUBIE)),
  down: chain(rotateX(-90), translate(0, 0, HALF_CUBIE)),
  front: translate(0, 0, HALF_CUBIE),
  back: chain(rotateY(180), translate(0, 0, HALF_CUBIE)),
  right: chain(rotateY(90), translate(0, 0, HALF_CUBIE)),
  left: chain(rotateY(-90), translate(0, 0, HALF_CUBIE)),
}

const HINT_ORIENT: Record<FaceName, Mat> = {
  up: chain(rotateX(-90), translate(0, 0, -HINT_FLOAT)),
  down: chain(rotateX(90), translate(0, 0, -HINT_FLOAT)),
  front: chain(rotateY(180), translate(0, 0, -HINT_FLOAT)),
  back: translate(0, 0, -HINT_FLOAT),
  right: chain(rotateY(-90), translate(0, 0, -HINT_FLOAT)),
  left: chain(rotateY(90), translate(0, 0, -HINT_FLOAT)),
}

const LABEL_ORIENT: Record<string, Mat> = {
  U: chain(translate(0, -LABEL_FLOAT, 0), rotateX(90)),
  D: chain(translate(0, LABEL_FLOAT, 0), rotateX(-90)),
  R: chain(translate(LABEL_FLOAT, 0, 0), rotateY(90)),
  L: chain(translate(-LABEL_FLOAT, 0, 0), rotateY(-90)),
  F: translate(0, 0, LABEL_FLOAT),
  B: chain(translate(0, 0, -LABEL_FLOAT), rotateY(180)),
}

export const LABEL_FONT_PX = Math.round(LABEL_SIZE * 0.64)
export const LABEL_STROKE_PX = Math.round(LABEL_SIZE * 0.06)

function pieceNameOf(colors: Color[]): string {
  const primary = colors.includes('W') ? 'W' : colors.includes('Y') ? 'Y' : ''
  const rest = colors.filter(c => c !== 'W' && c !== 'Y').slice().sort().join('')
  return primary + rest
}

export type Sticker = { faceIndex: number; color: Color }
export type Cubie = { x: number; y: number; z: number; piece: string; stickers: Sticker[] }

export function cubiesFromState(state: CubeState): Cubie[] {
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

export type CubeLooks = { face: LookPair[]; hint: LookPair[] }

export function cubeLooks(colorHex: Record<Color, string>, shadeColor: string, dimOpacity: number): CubeLooks {
  const shade = parseColor(shadeColor)
  const face: LookPair[] = []
  const hint: LookPair[] = []
  COLOR_ORDER.forEach(name => {
    const color = parseColor(colorHex[name])
    const band = over(HINT_BORDER, color)
    face.push({
      bright: { frame: OPAQUE_BLACK, fill: color, opacity: 1 },
      dim: { frame: over(shade, OPAQUE_BLACK), fill: over(shade, color), opacity: dimOpacity },
    })
    hint.push({
      bright: { frame: band, fill: color, opacity: HINT_OPACITY },
      dim: { frame: over(shade, band), fill: over(shade, color), opacity: HINT_OPACITY * dimOpacity },
    })
  })
  return { face, hint }
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

function lerpRgba(from: Rgba, to: Rgba, t: number): Rgba {
  return { r: lerp(from.r, to.r, t), g: lerp(from.g, to.g, t), b: lerp(from.b, to.b, t), a: lerp(from.a, to.a, t) }
}

function lerpLook(pair: LookPair, t: number): Look {
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

export function sceneGeometry(angles: { x: number; y: number }): SceneGeometry {
  const labelInset = (CUBE_PX - LABEL_SIZE) / 2
  return {
    projection: aboutOrigin(SCENE_PX / 2, SCENE_PX / 2, perspective(PERSPECTIVE_PX)),
    placement: chain(
      translate(CUBE_LEFT, CUBE_LEFT, 0),
      aboutOrigin(CUBE_MID, CUBE_MID, chain(scaleXY(CUBE_SCALE), rotateX(-angles.x), rotateY(-angles.y))),
    ),
    faceLocal: FACE_NAMES.map(name => aboutOrigin(HALF_CUBIE, HALF_CUBIE, FACE_ORIENT[name])),
    hintLocal: FACE_NAMES.map(name =>
      chain(translate(HINT_INSET, HINT_INSET, 0), aboutOrigin(HINT_PX / 2, HINT_PX / 2, HINT_ORIENT[name]))),
    labels: Object.entries(LABEL_ORIENT).map(([face, orient]) => ({
      letter: face,
      matrix: chain(aboutOrigin(CUBE_MID, CUBE_MID, orient), translate(labelInset, labelInset, 0)),
    })),
  }
}

function cornerAt(screen: Mat, x: number, y: number): [number, number] {
  const q = apply(screen, x, y, 0)
  return [q.x / q.w, q.y / q.w]
}

function ringPath(screen: Mat, size: number, inset: number): string {
  const lo = inset
  const hi = size - inset
  const corners: Array<[number, number]> = [[lo, lo], [hi, lo], [hi, hi], [lo, hi]]
  const points = corners.map(([x, y]) => cornerAt(screen, x, y).map(snap))
  const steps: number[] = []
  for (let i = 1; i < points.length; i++) {
    steps.push(snap(points[i][0] - points[i - 1][0]), snap(points[i][1] - points[i - 1][1]))
  }
  return `M${joinCoords(points[0])}l${joinCoords(steps)}Z`
}

function facesCamera(screen: Mat, size: number): boolean {
  const o = cornerAt(screen, 0, 0)
  const px = cornerAt(screen, size, 0)
  const py = cornerAt(screen, 0, size)
  return (px[0] - o[0]) * (py[1] - o[1]) - (px[1] - o[1]) * (py[0] - o[0]) > 0
}

function rgbString(c: Rgba): string {
  return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`
}

function opacityAttr(value: number): string {
  return value >= 1 ? '' : ` opacity="${ratio(value)}"`
}

function quadMarkup(screen: Mat, size: number, look: Look, border: number): string {
  const inner = ringPath(screen, size, border)
  const outer = ringPath(screen, size, 0)
  const fillHidesFrameCenter = look.fill.a >= 1
  const framePath = fillHidesFrameCenter
    ? `<path d="${outer}" fill="${rgbString(look.frame)}"${opacityAttr(look.frame.a)}/>`
    : `<path d="${outer}${inner}" fill-rule="evenodd" fill="${rgbString(look.frame)}"${opacityAttr(look.frame.a)}/>`
  const fillPath = `<path d="${inner}" fill="${rgbString(look.fill)}"${opacityAttr(look.fill.a)}/>`
  return look.opacity >= 1
    ? framePath + fillPath
    : `<g opacity="${ratio(look.opacity)}">${framePath}${fillPath}</g>`
}

function labelMarkup(screen: Mat, letter: string): string {
  const o = cornerAt(screen, 0, 0)
  const px = cornerAt(screen, LABEL_SIZE, 0)
  const py = cornerAt(screen, 0, LABEL_SIZE)
  const m = [
    (px[0] - o[0]) / LABEL_SIZE, (px[1] - o[1]) / LABEL_SIZE,
    (py[0] - o[0]) / LABEL_SIZE, (py[1] - o[1]) / LABEL_SIZE,
    o[0], o[1],
  ].map(ratio).join(',')
  return `<text transform="matrix(${m})" x="${LABEL_SIZE / 2}" y="${LABEL_SIZE / 2}"`
    + ` font-family="sans-serif" font-size="${LABEL_FONT_PX}" font-weight="bold" fill="#fff"`
    + ` stroke="#000" stroke-width="${LABEL_STROKE_PX}" paint-order="stroke" stroke-linejoin="round"`
    + ` text-anchor="middle" dominant-baseline="central">${letter}</text>`
}

function svgDocument(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_PX} ${SCENE_PX}"`
    + ` width="${SCENE_PX}" height="${SCENE_PX}" style="display:block">${body}</svg>`
}

type Drawable = { depth: number; markup: string }

export type CubeSvgOptions = {
  state: CubeState
  angles: { x: number; y: number }
  colorHex: Record<Color, string>
  showFacelets: boolean
  showFaceLabels: boolean
  shadeColor: string
  dimOpacity: number
  highlight: string[] | null
}

export function buildCubeSvg(opts: CubeSvgOptions): string {
  const { state, angles, colorHex, showFacelets, showFaceLabels, shadeColor, dimOpacity, highlight } = opts

  const geometry = sceneGeometry(angles)
  const looks = cubeLooks(colorHex, shadeColor, dimOpacity)
  const highlightSet = highlight ? new Set(highlight) : null
  const drawables: Drawable[] = []

  const placeLocal = (local: Mat) => {
    const world = mul(geometry.placement, local)
    return { world, screen: mul(geometry.projection, world) }
  }

  const addQuad = (local: Mat, size: number, look: Look, border: number, cull: boolean) => {
    const { world, screen } = placeLocal(local)
    if (cull && !facesCamera(screen, size)) return
    drawables.push({
      depth: apply(world, size / 2, size / 2, 0).z,
      markup: quadMarkup(screen, size, look, border),
    })
  }

  cubiesFromState(state).forEach(cubie => {
    const dim = highlightSet !== null && !highlightSet.has(cubie.piece) ? 1 : 0
    const place = cubiePlacement(cubie.x, cubie.y, cubie.z)
    cubie.stickers.forEach(sticker => {
      const colorIndex = COLOR_ORDER.indexOf(sticker.color)
      // stickers skip backface culling so a highlighted piece on the far side is still drawn
      // and shows through the translucent dimmed pieces in front of it. Hints can't: they
      // float one sticker outside the cube, so an unculled near-side hint would sit between
      // the camera and the cube.
      addQuad(mul(place, geometry.faceLocal[sticker.faceIndex]), CUBIE_PX,
        lerpLook(looks.face[colorIndex], dim), FACE_BORDER_PX, false)
      if (!showFacelets) return
      addQuad(mul(place, geometry.hintLocal[sticker.faceIndex]), HINT_PX,
        lerpLook(looks.hint[colorIndex], dim), HINT_BORDER_PX, true)
    })
  })

  if (showFaceLabels) {
    geometry.labels.forEach(label => {
      const { world, screen } = placeLocal(label.matrix)
      if (!facesCamera(screen, LABEL_SIZE)) return
      drawables.push({
        depth: apply(world, LABEL_SIZE / 2, LABEL_SIZE / 2, 0).z,
        markup: labelMarkup(screen, label.letter),
      })
    })
  }

  drawables.sort((a, b) => a.depth - b.depth)
  return svgDocument(drawables.map(d => d.markup).join(''))
}
