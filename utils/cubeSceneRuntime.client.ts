import {
  cubeLooks,
  cubeRotation,
  cubiesFromState,
  cubiePlacement,
  mul,
  renderSceneMarkup,
  sceneGeometry,
  type Axis,
  type CubeLooks,
  type Mat,
  type SceneGeometry,
  type Sticker,
} from './cubeSvgRender'
import { stateFromFacelets, type RotationInfo } from './cubeMoves'
import {
  CUBE_SVG_CLASS,
  CYCLE_PAUSE_END_MS,
  CYCLE_PAUSE_START_MS,
  DEFAULT_TURN_MS,
  DIM_FADE_MS,
  restHighlight,
  SCENE_DATA_ATTR,
  type SceneIsland,
} from './cubeSceneIsland'

type Slot = [number, number, number]

type RuntimeCubie = {
  piece: string
  stickers: Sticker[]
  pos: Slot
  home: Slot
  place: Mat
  mat: Mat
  live: Mat | null
  dim: number
  dimFrom: number
  dimTo: number
  fadeStart: number
}

type Turn = { move: RotationInfo; affected: RuntimeCubie[] }
type MoveAnim = { turns: Turn[]; turnMs: number; start: number; done: () => void }

export function cubieWorld(geometry: SceneGeometry, cubie: { mat: Mat; live: Mat | null }): Mat {
  return mul(geometry.placement, cubie.live ? mul(cubie.live, cubie.mat) : cubie.mat)
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

export function createScene(root: HTMLElement, island: SceneIsland): void {
  const svgEl = root.querySelector<SVGElement>(`.${CUBE_SVG_CLASS}`)
  const overlayEl = root.querySelector<HTMLElement>('.overlay')
  if (!svgEl || !overlayEl) return
  const iconPlay = overlayEl.querySelector<HTMLElement>('.icon-play')
  const progressFill = island.progress ? root.querySelector<HTMLElement>('.progress-fill') : null

  const geometry: SceneGeometry = sceneGeometry(island.angles)
  const looks: CubeLooks = cubeLooks(island.colors, island.shade, island.dim)

  const cubies: RuntimeCubie[] = cubiesFromState(stateFromFacelets(island.facelets)).map(c => {
    const place = cubiePlacement(c.x, c.y, c.z)
    const home: Slot = [c.x, c.y, c.z]
    return {
      piece: c.piece,
      stickers: c.stickers,
      pos: [...home] as Slot,
      home,
      place,
      mat: place,
      live: null,
      dim: 0,
      dimFrom: 0,
      dimTo: 0,
      fadeStart: 0,
    }
  })

  const totalMoves = island.lines.reduce((sum, line) => sum + line.moves.length, 0)

  let moveAnim: MoveAnim | null = null
  let rafId = 0
  let paused = true
  let animating = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lineIdx = 0
  let moveIdx = 0
  let movesPlayed = 0

  function render(): void {
    svgEl!.innerHTML = renderSceneMarkup({
      geometry,
      looks,
      showFacelets: island.hints,
      showFaceLabels: island.labels,
      cubies: cubies.map(c => ({
        stickers: c.stickers,
        world: cubieWorld(geometry, c),
        dim: c.dim,
      })),
    })
  }

  function scheduleFrame(): void {
    if (!rafId) rafId = requestAnimationFrame(frame)
  }

  function frame(now: number): void {
    rafId = 0
    let busy = false
    if (moveAnim && stepMove(now)) busy = true
    if (stepFades(now)) busy = true
    render()
    if (busy || moveAnim) scheduleFrame()
  }

  function stepMove(now: number): boolean {
    const anim = moveAnim!
    if (!anim.start) anim.start = now
    const progress = anim.turnMs > 0 ? Math.min(1, (now - anim.start) / anim.turnMs) : 1
    const eased = easeMove(progress)

    for (const turn of anim.turns) {
      const live = cubeRotation(turn.move.axis, turn.move.angle * eased)
      for (const cubie of turn.affected) cubie.live = live
    }
    if (progress < 1) return true

    for (const turn of anim.turns) {
      const settled = cubeRotation(turn.move.axis, turn.move.angle)
      for (const cubie of turn.affected) {
        cubie.mat = mul(settled, cubie.mat)
        cubie.live = null
        cubie.pos = rotateSlot(cubie.pos, turn.move.axis, turn.move.angle)
      }
    }
    moveAnim = null
    animating = false
    anim.done()
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

  function setHighlight(set: string[] | null, animate: boolean): void {
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

  function updateOverlay(): void {
    overlayEl!.style.background = paused ? 'rgba(0,0,0,0.45)' : 'transparent'
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
    setHighlight(line.highlight, true)
    scheduleFrame()
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
    applyMove(line.moves[mi], turnMs, () => {
      movesPlayed++
      moveIdx = mi + 1
      if (paused) return
      playMove(idx, mi + 1)
    })
  }

  function applyMove(group: RotationInfo[], turnMs: number, done: () => void): void {
    animating = true
    moveAnim = {
      turns: group.map(move => ({
        move,
        affected: cubies.filter(c => move.layers.indexOf(c.pos[axisIndex(move.axis)]) !== -1),
      })),
      turnMs,
      start: 0,
      done,
    }
    scheduleFrame()
  }

  function reset(): void {
    if (progressFill) {
      progressFill.style.transition = 'none'
      progressFill.style.width = '0%'
    }
    for (const cubie of cubies) {
      cubie.pos = [...cubie.home] as Slot
      cubie.mat = cubie.place
      cubie.live = null
    }
    setHighlight(restHighlight(island), true)
    scheduleFrame()
    lineIdx = 0
    moveIdx = 0
    movesPlayed = 0
    if (paused) {
      updateOverlay()
      return
    }
    timeoutId = setTimeout(() => playLine(0), CYCLE_PAUSE_START_MS)
  }

  setHighlight(restHighlight(island), false)

  if (totalMoves === 0) return

  updateOverlay()
  root.addEventListener('click', () => {
    paused = !paused
    updateOverlay()
    if (paused) {
      clearPending()
      return
    }
    if (animating) return
    if (lineIdx >= island.lines.length) reset()
    else if (moveIdx === 0) timeoutId = setTimeout(() => playLine(lineIdx), CYCLE_PAUSE_START_MS)
    else timeoutId = setTimeout(() => playMove(lineIdx, moveIdx), CYCLE_PAUSE_START_MS)
  })
}

export function mountScenes(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>(`[${SCENE_DATA_ATTR}]`).forEach(root => {
    const script = root.querySelector<HTMLScriptElement>('script[type="application/json"]')
    if (!script || !script.textContent) return
    try {
      createScene(root, JSON.parse(script.textContent) as SceneIsland)
    } catch (e) {
      console.error('cube scene failed to mount', e)
    }
  })
}
