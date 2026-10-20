import {
  cubeLooks,
  cubeRotation,
  cubiesFromState,
  cubiePlacement,
  DEFAULT_SCENE_VIEW,
  drawablePaths,
  mul,
  sceneDrawables,
  sceneGeometry,
  type Axis,
  type CubeLooks,
  type Mat,
  type PathAttrs,
  type Point,
  type SceneDrawable,
  type SceneGeometry,
  type SceneRenderInput,
  type SceneView,
  type Sticker,
} from './cubeSvgRender'
import { stateFromFacelets, type RotationInfo } from './cubeMoves'
import type { Color } from '../composables/recon/SimpleCube'
import {
  CUBE_SVG_CLASS,
  CYCLE_PAUSE_END_MS,
  CYCLE_PAUSE_START_MS,
  DEFAULT_TURN_MS,
  DIM_FADE_MS,
  restHighlight,
  SCENE_DATA_ATTR,
  SCENE_MOUNTED_ATTR,
  type SceneIsland,
} from './cubeSceneIsland'

type Slot = [number, number, number]

export type RuntimeCubie = {
  piece: string
  stickers: Sticker[]
  pos: Slot
  mat: Mat
  live: Mat | null
  dim: number
  dimFrom: number
  dimTo: number
  fadeStart: number
}

type Turn = { move: RotationInfo; affected: RuntimeCubie[] }
type MoveAnim = { turns: Turn[]; turnMs: number; start: number; done: () => void }
export type Angles = { x: number; y: number }

export type SceneLook = {
  colors: Record<Color, string>
  shade: string
  dim: number
  hints: boolean
  labels: boolean
  paints?: ReadonlyMap<number, string>
}

export type CubeSceneOptions = SceneLook & {
  facelets: string
  angles: Angles
  view?: SceneView
  highlight?: string[] | null
  ease?: (x: number) => number
  orbit?: { target: HTMLElement; damping: number } | null
  prerendered?: boolean
}

export type DrawOverrides = { hints?: boolean; labels?: boolean; view?: SceneView }

export type CubeScene = {
  setFacelets: (facelets: string) => void
  applyMove: (group: RotationInfo[], turnMs: number, done: () => void) => void
  isAnimating: () => boolean
  setHighlight: (set: string[] | null, animate: boolean) => void
  setLook: (look: Partial<SceneLook>) => void
  setView: (view: SceneView) => void
  setSpin: (yDeg: number) => void
  pickSticker: (x: number, y: number) => number | null
  drawables: (overrides?: DrawOverrides) => SceneDrawable[]
  consumeDrag: () => boolean
  destroy: () => void
}

export function cubieWorld(geometry: SceneGeometry, cubie: { mat: Mat; live: Mat | null }, spin: Mat | null = null): Mat {
  const local = cubie.live ? mul(cubie.live, cubie.mat) : cubie.mat
  return mul(geometry.placement, spin ? mul(spin, local) : local)
}

function quadContains(corners: Point[], x: number, y: number): boolean {
  let winding = 0
  for (let i = 0; i < corners.length; i++) {
    const [ax, ay] = corners[i]
    const [bx, by] = corners[(i + 1) % corners.length]
    const side = Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax))
    if (side === 0) continue
    if (winding === 0) winding = side
    else if (side !== winding) return false
  }
  return true
}

function bezierPoint(t: number, a: number, b: number): number {
  const u = 1 - t
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
}

function bezierEase(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  return x => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 24; i++) {
      const t = (lo + hi) / 2
      if (bezierPoint(t, x1, x2) < x) lo = t
      else hi = t
    }
    return bezierPoint((lo + hi) / 2, y1, y2)
  }
}

const easeMove = bezierEase(0.42, 0, 0.58, 1)
const easeFade = bezierEase(0.25, 0.1, 0.25, 1)

const ORBIT_DRAG_THRESHOLD_PX = 4
const ORBIT_SETTLED_DEG = 0.01

function rotateSlot(pos: Slot, axis: Axis, angle: number): Slot {
  const [x, y, z] = pos
  const c = Math.round(Math.cos((angle * Math.PI) / 180))
  const s = Math.round(Math.sin((angle * Math.PI) / 180))
  if (axis === 'x') return [x, c * y - s * z, s * y + c * z]
  if (axis === 'y') return [c * x + s * z, y, -s * x + c * z]
  return [c * x - s * y, s * x + c * y, z]
}

function axisIndex(axis: Axis): number {
  return axis === 'x' ? 0 : axis === 'y' ? 1 : 2
}

function buildCubies(facelets: string): RuntimeCubie[] {
  return cubiesFromState(stateFromFacelets(facelets)).map(c => ({
    piece: c.piece,
    stickers: c.stickers,
    pos: [c.x, c.y, c.z],
    mat: cubiePlacement(c.x, c.y, c.z),
    live: null,
    dim: 0,
    dimFrom: 0,
    dimTo: 0,
    fadeStart: 0,
  }))
}

function turnsFor(cubies: RuntimeCubie[], group: RotationInfo[]): Turn[] {
  return group.map(move => ({
    move,
    affected: cubies.filter(c => move.layers.indexOf(c.pos[axisIndex(move.axis)]) !== -1),
  }))
}

function settleTurns(turns: Turn[]): void {
  for (const turn of turns) {
    const settled = cubeRotation(turn.move.axis, turn.move.angle)
    for (const cubie of turn.affected) {
      cubie.mat = mul(settled, cubie.mat)
      cubie.live = null
      cubie.pos = rotateSlot(cubie.pos, turn.move.axis, turn.move.angle)
    }
  }
}

function poseTurns(turns: Turn[], eased: number): void {
  for (const turn of turns) {
    const live = cubeRotation(turn.move.axis, turn.move.angle * eased)
    for (const cubie of turn.affected) cubie.live = live
  }
}

export function cubiesAtTime(
  facelets: string,
  groups: RotationInfo[][],
  durations: number[],
  timeMs: number,
  ease: (x: number) => number = easeMove,
): RuntimeCubie[] {
  const cubies = buildCubies(facelets)
  let remainingMs = timeMs
  for (let i = 0; i < groups.length && remainingMs > 0; i++) {
    const turns = turnsFor(cubies, groups[i])
    if (remainingMs >= durations[i]) settleTurns(turns)
    else poseTurns(turns, ease(remainingMs / durations[i]))
    remainingMs -= durations[i]
  }
  return cubies
}

export type Orbit = {
  angles: () => Angles
  setAngles: (angles: Angles) => void
  step: () => boolean
  consumeDrag: () => boolean
  destroy: () => void
}

export function createOrbit(target: HTMLElement, start: Angles, damping: number, onDrag?: () => void): Orbit {
  const stepFraction = damping > 0 ? damping : 1
  let angles = start
  let goal: Angles | null = null
  let dragStart: { x: number; y: number; angles: Angles } | null = null
  let dragged = false

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    dragStart = { x: e.clientX, y: e.clientY, angles: goal ?? angles }
    dragged = false
    target.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!dragStart) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    if (!dragged && Math.hypot(dx, dy) < ORBIT_DRAG_THRESHOLD_PX) return
    dragged = true
    const degPerPx = 360 / target.clientHeight
    goal = {
      x: Math.max(-90, Math.min(90, dragStart.angles.x + dy * degPerPx)),
      y: dragStart.angles.y - dx * degPerPx,
    }
    onDrag?.()
  }
  const endDrag = () => {
    dragStart = null
  }

  target.addEventListener('pointerdown', onPointerDown)
  target.addEventListener('pointermove', onPointerMove)
  target.addEventListener('pointerup', endDrag)
  target.addEventListener('pointercancel', endDrag)

  return {
    angles: () => angles,
    setAngles: next => {
      angles = next
      goal = null
    },
    step: () => {
      if (!goal) return false
      const remaining = Math.max(Math.abs(goal.x - angles.x), Math.abs(goal.y - angles.y))
      if (stepFraction >= 1 || remaining < ORBIT_SETTLED_DEG) {
        angles = goal
        goal = null
      } else {
        angles = {
          x: angles.x + (goal.x - angles.x) * stepFraction,
          y: angles.y + (goal.y - angles.y) * stepFraction,
        }
      }
      return goal !== null
    },
    consumeDrag: () => {
      const wasDragged = dragged
      dragged = false
      return wasDragged
    },
    destroy: () => {
      target.removeEventListener('pointerdown', onPointerDown)
      target.removeEventListener('pointermove', onPointerMove)
      target.removeEventListener('pointerup', endDrag)
      target.removeEventListener('pointercancel', endDrag)
    },
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const HIDDEN_PATH: PathAttrs = { display: 'none' }

type SyncedElement = { el: Element; values: Map<string, string | null> }
type DrawableSlot = { group: SyncedElement; paths: SyncedElement[] }

function syncAttribute(target: SyncedElement, name: string, value: string | null): void {
  if (target.values.get(name) === value) return
  target.values.set(name, value)
  if (value === null) target.el.removeAttribute(name)
  else target.el.setAttribute(name, value)
}

function syncAttributes(target: SyncedElement, attrs: PathAttrs): void {
  for (const name of target.values.keys()) {
    if (!(name in attrs)) syncAttribute(target, name, null)
  }
  for (const name in attrs) syncAttribute(target, name, attrs[name])
}

export type ScenePainter = (drawables: SceneDrawable[]) => void

export function createSvgPainter(svgEl: Element): ScenePainter {
  const slots: DrawableSlot[] = []

  const createSlot = (): DrawableSlot => {
    const group = document.createElementNS(SVG_NS, 'g')
    const paths = [document.createElementNS(SVG_NS, 'path'), document.createElementNS(SVG_NS, 'path')]
    group.append(...paths)
    svgEl.append(group)
    return {
      group: { el: group, values: new Map() },
      paths: paths.map(el => ({ el, values: new Map() })),
    }
  }

  return drawables => {
    if (!slots.length) svgEl.replaceChildren()
    while (slots.length < drawables.length) slots.push(createSlot())
    while (slots.length > drawables.length) slots.pop()!.group.el.remove()

    drawables.forEach((drawable, i) => {
      const slot = slots[i]
      const { groupOpacity, paths } = drawablePaths(drawable)
      syncAttribute(slot.group, 'opacity', groupOpacity)
      slot.paths.forEach((path, p) => syncAttributes(path, paths[p] ?? HIDDEN_PATH))
    })
  }
}

export function createCubeScene(paint: ScenePainter, options: CubeSceneOptions): CubeScene {
  let look: SceneLook = {
    colors: options.colors,
    shade: options.shade,
    dim: options.dim,
    hints: options.hints,
    labels: options.labels,
    paints: options.paints,
  }
  let looks: CubeLooks = cubeLooks(look.colors, look.shade, look.dim, look.paints)
  let angles = options.angles
  let view = options.view ?? DEFAULT_SCENE_VIEW
  let geometry: SceneGeometry = sceneGeometry(angles, view)
  let spin: Mat | null = null
  const ease = options.ease ?? easeMove

  let cubies = buildCubies(options.facelets)
  let highlight = options.highlight ?? null
  let moveAnim: MoveAnim | null = null
  let rafId = 0

  function renderInput(frameGeometry: SceneGeometry, hints: boolean, labels: boolean): SceneRenderInput {
    return {
      geometry: frameGeometry,
      looks,
      showFacelets: hints,
      showFaceLabels: labels,
      cubies: cubies.map(c => ({
        stickers: c.stickers,
        world: cubieWorld(frameGeometry, c, spin),
        dim: c.dim,
      })),
    }
  }

  function render(): void {
    paint(sceneDrawables(renderInput(geometry, look.hints, look.labels)))
  }

  function scheduleFrame(): void {
    if (!rafId) rafId = requestAnimationFrame(frame)
  }

  function frame(now: number): void {
    rafId = 0
    let busy = false
    if (moveAnim && stepMove(now)) busy = true
    if (stepFades(now)) busy = true
    if (stepOrbit()) busy = true
    render()
    if (busy || moveAnim) scheduleFrame()
  }

  function settleMove(anim: MoveAnim): void {
    settleTurns(anim.turns)
    moveAnim = null
    anim.done()
  }

  function stepMove(now: number): boolean {
    const anim = moveAnim!
    if (!anim.start) anim.start = now
    const progress = anim.turnMs > 0 ? Math.min(1, (now - anim.start) / anim.turnMs) : 1
    poseTurns(anim.turns, ease(progress))
    if (progress < 1) return true

    settleMove(anim)
    return false
  }

  function stepFades(now: number): boolean {
    let busy = false
    for (const cubie of cubies) {
      if (!cubie.fadeStart) continue
      const progress = Math.min(1, (now - cubie.fadeStart) / DIM_FADE_MS)
      cubie.dim = cubie.dimFrom + (cubie.dimTo - cubie.dimFrom) * easeFade(progress)
      if (progress < 1) busy = true
      else cubie.fadeStart = 0
    }
    return busy
  }

  function applyHighlight(set: string[] | null, animate: boolean): void {
    highlight = set
    const now = performance.now()
    for (const cubie of cubies) {
      const target = set && set.indexOf(cubie.piece) === -1 ? 1 : 0
      if (target === cubie.dimTo) continue
      cubie.dimTo = target
      if (animate) {
        cubie.dimFrom = cubie.dim
        cubie.fadeStart = now
      } else {
        cubie.dim = target
        cubie.dimFrom = target
        cubie.fadeStart = 0
      }
    }
  }

  function setFacelets(facelets: string): void {
    const interrupted = moveAnim
    moveAnim = null
    const previous = new Map(cubies.map(c => [c.piece, c]))
    cubies = buildCubies(facelets).map(c => {
      const prior = previous.get(c.piece)
      if (!prior) return c
      return { ...c, dim: prior.dim, dimFrom: prior.dimFrom, dimTo: prior.dimTo, fadeStart: prior.fadeStart }
    })
    applyHighlight(highlight, false)
    scheduleFrame()
    interrupted?.done()
  }

  function applyMove(group: RotationInfo[], turnMs: number, done: () => void): void {
    while (moveAnim) settleMove(moveAnim)
    moveAnim = {
      turns: turnsFor(cubies, group),
      turnMs,
      start: 0,
      done,
    }
    scheduleFrame()
  }

  const orbit = options.orbit ? createOrbit(options.orbit.target, angles, options.orbit.damping, scheduleFrame) : null

  function stepOrbit(): boolean {
    if (!orbit) return false
    const busy = orbit.step()
    if (orbit.angles() !== angles) {
      angles = orbit.angles()
      geometry = sceneGeometry(angles, view)
    }
    return busy
  }

  applyHighlight(highlight, false)
  if (!options.prerendered) scheduleFrame()

  return {
    setFacelets,
    applyMove,
    isAnimating: () => moveAnim !== null,
    setHighlight: (set, animate) => {
      applyHighlight(set, animate)
      scheduleFrame()
    },
    setLook: next => {
      look = { ...look, ...next }
      looks = cubeLooks(look.colors, look.shade, look.dim, look.paints)
      scheduleFrame()
    },
    setView: next => {
      view = next
      geometry = sceneGeometry(angles, view)
      scheduleFrame()
    },
    setSpin: yDeg => {
      spin = yDeg === 0 ? null : cubeRotation('y', yDeg)
      scheduleFrame()
    },
    pickSticker: (x, y) => {
      const drawables = sceneDrawables(renderInput(geometry, look.hints, look.labels))
      for (let i = drawables.length - 1; i >= 0; i--) {
        const drawable = drawables[i]
        if (drawable.kind !== 'quad' || drawable.facelet === null) continue
        if (quadContains(drawable.outer, x, y)) return drawable.facelet
      }
      return null
    },
    drawables: (overrides = {}) => {
      const frameGeometry = overrides.view ? sceneGeometry(angles, overrides.view) : geometry
      return sceneDrawables(renderInput(frameGeometry, overrides.hints ?? look.hints, overrides.labels ?? look.labels))
    },
    consumeDrag: () => orbit?.consumeDrag() ?? false,
    destroy: () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
      moveAnim = null
      orbit?.destroy()
    },
  }
}

export function createScene(root: HTMLElement, island: SceneIsland): void {
  const svgEl = root.querySelector<SVGElement>(`.${CUBE_SVG_CLASS}`)
  const overlayEl = root.querySelector<HTMLElement>('.overlay')
  if (!svgEl) return
  const iconPlay = overlayEl?.querySelector<HTMLElement>('.icon-play') ?? null
  const progressFill = island.progress ? root.querySelector<HTMLElement>('.progress-fill') : null

  const scene = createCubeScene(createSvgPainter(svgEl), {
    facelets: island.facelets,
    angles: island.angles,
    colors: island.colors,
    shade: island.shade,
    dim: island.dim,
    hints: island.hints,
    labels: island.labels,
    highlight: restHighlight(island),
    orbit: island.orbit ? { target: root, damping: 0 } : null,
    prerendered: true,
  })

  const totalMoves = island.lines.reduce((sum, line) => sum + line.moves.length, 0)

  let paused = true
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lineIdx = 0
  let moveIdx = 0
  let movesPlayed = 0

  function updateOverlay(): void {
    if (!overlayEl) return
    overlayEl.style.background = paused ? 'rgba(0,0,0,0.45)' : 'transparent'
    if (iconPlay) iconPlay.style.opacity = paused ? '0.85' : '0'
  }

  function clearPending(): void {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  function playLine(idx: number): void {
    if (paused) return
    lineIdx = idx
    moveIdx = 0
    if (idx >= island.lines.length) {
      if (island.loop) timeoutId = setTimeout(reset, CYCLE_PAUSE_END_MS)
      else {
        paused = true
        updateOverlay()
      }
      return
    }
    const line = island.lines[idx]
    scene.setHighlight(line.highlight, true)
    timeoutId = setTimeout(() => {
      if (paused) return
      if (line.moves.length === 0) playLine(idx + 1)
      else playMove(idx, 0)
    }, line.delay || 0)
  }

  function playMove(idx: number, mi: number): void {
    if (paused) return
    lineIdx = idx
    moveIdx = mi
    const line = island.lines[idx]
    if (mi >= line.moves.length) {
      playLine(idx + 1)
      return
    }
    const turnMs = line.durations[mi] || DEFAULT_TURN_MS
    if (progressFill) {
      progressFill.style.transition = `width ${turnMs}ms linear`
      progressFill.style.width = `${((movesPlayed + 1) / totalMoves) * 100}%`
    }
    scene.applyMove(line.moves[mi], turnMs, () => {
      movesPlayed++
      moveIdx = mi + 1
      if (paused) return
      playMove(idx, mi + 1)
    })
  }

  function reset(): void {
    if (progressFill) {
      progressFill.style.transition = 'none'
      progressFill.style.width = '0%'
    }
    scene.setFacelets(island.facelets)
    scene.setHighlight(restHighlight(island), true)
    lineIdx = 0
    moveIdx = 0
    movesPlayed = 0
    if (paused) {
      updateOverlay()
      return
    }
    timeoutId = setTimeout(() => playLine(0), CYCLE_PAUSE_START_MS)
  }

  if (totalMoves === 0) return

  updateOverlay()
  root.addEventListener('click', () => {
    if (scene.consumeDrag()) return
    paused = !paused
    updateOverlay()
    if (paused) {
      clearPending()
      return
    }
    if (scene.isAnimating()) return
    if (lineIdx >= island.lines.length) reset()
    else if (moveIdx === 0) timeoutId = setTimeout(() => playLine(lineIdx), CYCLE_PAUSE_START_MS)
    else timeoutId = setTimeout(() => playMove(lineIdx, moveIdx), CYCLE_PAUSE_START_MS)
  })
}

export function mountScenes(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>(`[${SCENE_DATA_ATTR}]`).forEach(root => {
    if (root.hasAttribute(SCENE_MOUNTED_ATTR)) return
    const script = root.querySelector<HTMLScriptElement>('script[type="application/json"]')
    if (!script || !script.textContent) return
    try {
      createScene(root, JSON.parse(script.textContent) as SceneIsland)
      root.setAttribute(SCENE_MOUNTED_ATTR, '')
    } catch (e) {
      console.error('cube scene failed to mount', e)
    }
  })
}
