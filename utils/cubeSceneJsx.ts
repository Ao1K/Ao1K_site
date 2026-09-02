import { DEFAULT_SCENE_LOOK, type AuthoredLine, type AuthoredScene, type SceneMove } from './cubeSceneAuthoring'
import { DEFAULT_TURN_MS } from './cubeSceneIsland'

type Prop = { name: string; value: string }

function sameAngles(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return a.x === b.x && a.y === b.y
}

function sameColors(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every(k => (a[k] ?? '').toLowerCase() === (b[k] ?? '').toLowerCase())
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '&quot;')}"`
}

function moveLiteral(entry: SceneMove): string {
  if (typeof entry === 'string') return JSON.stringify(entry)
  if (entry.length === 1) return JSON.stringify(entry[0])
  return `[${entry.map(m => JSON.stringify(m)).join(', ')}]`
}

function lineLiteral(line: AuthoredLine): string {
  const parts = [`moves: [${line.moves.map(moveLiteral).join(', ')}]`]
  const durations = line.durations ?? []
  if (durations.some(d => d !== DEFAULT_TURN_MS)) parts.push(`durations: [${durations.join(', ')}]`)
  if (line.delay) parts.push(`delay: ${line.delay}`)
  if (line.highlight) parts.push(`highlight: [${line.highlight.map(h => JSON.stringify(h)).join(', ')}]`)
  return `    { ${parts.join(', ')} }`
}

function lookProps(scene: AuthoredScene): Prop[] {
  const props: Prop[] = []
  if (scene.angles && !sameAngles(scene.angles, DEFAULT_SCENE_LOOK.angles)) {
    props.push({ name: 'angles', value: `{{ x: ${scene.angles.x}, y: ${scene.angles.y} }}` })
  }
  if (scene.colors && !sameColors(scene.colors, DEFAULT_SCENE_LOOK.colors)) {
    props.push({ name: 'colors', value: `{${JSON.stringify(scene.colors)}}` })
  }
  if (scene.shade && scene.shade !== DEFAULT_SCENE_LOOK.shade) {
    props.push({ name: 'shade', value: quote(scene.shade) })
  }
  if (scene.dim !== undefined && scene.dim !== DEFAULT_SCENE_LOOK.dim) {
    props.push({ name: 'dim', value: `{${scene.dim}}` })
  }
  if (scene.hints) props.push({ name: 'hints', value: '' })
  if (scene.labels) props.push({ name: 'labels', value: '' })
  return props
}

function serialize(tag: string, props: Prop[]): string {
  if (props.length === 0) return `<${tag} />`
  const body = props.map(p => (p.value === '' ? `  ${p.name}` : `  ${p.name}=${p.value}`)).join('\n')
  return `<${tag}\n${body}\n/>`
}

export function formatCubeSceneJsx(scene: AuthoredScene): string {
  const props: Prop[] = []
  if (scene.scramble) props.push({ name: 'scramble', value: quote(scene.scramble) })
  else if (scene.facelets) props.push({ name: 'facelets', value: quote(scene.facelets) })

  props.push(...lookProps(scene))

  if (scene.lines?.length) {
    props.push({ name: 'lines', value: `{[\n${scene.lines.map(lineLiteral).join(',\n')}\n  ]}` })
  }
  if (scene.loop) props.push({ name: 'loop', value: '' })
  if (scene.progress) props.push({ name: 'progress', value: '' })
  if (scene.startHighlighted) props.push({ name: 'startHighlighted', value: '' })

  return serialize('CubeScene', props)
}

export type AuthoredImage = Omit<AuthoredScene, 'lines' | 'loop' | 'progress' | 'startHighlighted'> & {
  highlight?: string[] | null
}

export function formatCubeImageJsx(image: AuthoredImage): string {
  const props: Prop[] = []
  if (image.scramble) props.push({ name: 'scramble', value: quote(image.scramble) })
  else if (image.facelets) props.push({ name: 'facelets', value: quote(image.facelets) })

  props.push(...lookProps(image))

  if (image.highlight) {
    props.push({ name: 'highlight', value: `{[${image.highlight.map(h => JSON.stringify(h)).join(', ')}]}` })
  }
  return serialize('CubeImage', props)
}
