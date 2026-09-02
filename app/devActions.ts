'use server'

import { readFile } from 'fs/promises'
import path from 'path'
import { minify } from 'html-minifier-terser'
import { buildCubeSvg, buildCubeSvgBody, SCENE_PX } from '../utils/cubeSvgRender'
import { faceletsFromState } from '../utils/cubeMoves'
import { CUBE_SCENE_CSS } from '../utils/cubeSceneCss'
import { buildColorHex, buildSceneIsland, type AuthoredLine } from '../utils/cubeSceneAuthoring'
import { islandFrameZero, CUBE_SVG_CLASS, SCENE_DATA_ATTR } from '../utils/cubeSceneIsland'
import type { CompileSceneOptions, CompileStaticImageOptions } from './devActionTypes'

const RUNTIME_PATH = path.join(process.cwd(), 'public', 'learn', 'cubeScene.js')

const PLAY_PATH = `M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z`

function embeddableJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

async function buildSceneHtml(opts: CompileSceneOptions): Promise<string> {
  const { initialState, lines, angles, cubeColors, showProgressBar, showFacelets, showFaceLabels,
    loopPlayback, backgroundColor, shadeColor, dimOpacity, startHighlighted, standalone } = opts

  const authoredLines: AuthoredLine[] = lines.map(line => ({
    moves: line.moveGroups,
    durations: line.moveDurationsMs,
    delay: line.delayMs,
    highlight: line.highlight,
  }))

  const island = buildSceneIsland({
    facelets: faceletsFromState(initialState),
    angles,
    colors: buildColorHex(cubeColors),
    shade: shadeColor,
    dim: dimOpacity,
    hints: showFacelets,
    labels: showFaceLabels,
    lines: authoredLines,
    loop: loopPlayback,
    progress: showProgressBar,
    startHighlighted,
  })

  const frameZero = buildCubeSvgBody(islandFrameZero(island))
  const progressHtml = showProgressBar ? `<div class="progress"><div class="progress-fill"></div></div>` : ''

  const sceneEl = `<div ${SCENE_DATA_ATTR} class="cube-scene">`
    + `<svg class="${CUBE_SVG_CLASS}" viewBox="0 0 ${SCENE_PX} ${SCENE_PX}">${frameZero}</svg>`
    + `<div class="overlay" style="background:rgba(0,0,0,0.45)">`
    + `<svg class="icon-play" viewBox="0 0 256 256" style="opacity:0.85"><path d="${PLAY_PATH}"></path></svg>`
    + `</div>${progressHtml}`
    + `<script type="application/json">${embeddableJson(island)}</script>`
    + `</div>`

  const runtimeJs = await readFile(RUNTIME_PATH, 'utf8')
  const scriptEl = `<script>${runtimeJs}</script>`
  const sceneCss = `${CUBE_SCENE_CSS}\n.cube-scene{width:${SCENE_PX}px}`

  if (!standalone) {
    return `<style>${sceneCss}</style>${sceneEl}${scriptEl}`
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cube Scene</title>
<style>
body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:${backgroundColor}}
${sceneCss}
</style>
</head>
<body>
${sceneEl}
${scriptEl}
</body>
</html>`
}

export async function compileCubeScene(opts: CompileSceneOptions): Promise<string> {
  return minify(await buildSceneHtml(opts), {
    collapseWhitespace: true,
    minifyCSS: true,
    removeComments: true,
    // without this the minifier strips the slash off <path/>, and the HTML parser then nests
    // each following path inside the previous one, multiplying their opacities.
    keepClosingSlash: true,
  })
}

function buildStaticImageHtml(opts: CompileStaticImageOptions): string {
  const { initialState, angles, cubeColors, showFacelets, showFaceLabels, backgroundColor, shadeColor, dimOpacity, standalone, highlight } = opts

  const svg = buildCubeSvg({
    state: initialState,
    angles,
    colorHex: buildColorHex(cubeColors),
    showFacelets,
    showFaceLabels,
    shadeColor,
    dimOpacity,
    highlight,
  })

  if (!standalone) {
    return svg
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cube Image</title>
<style>
body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:${backgroundColor}}
svg{width:${SCENE_PX}px;height:${SCENE_PX}px}
</style>
</head>
<body>
${svg}
</body>
</html>`
}

export async function compileStaticCubeImage(opts: CompileStaticImageOptions): Promise<string> {
  return minify(buildStaticImageHtml(opts), {
    collapseWhitespace: true,
    minifyCSS: true,
    removeComments: true,
    // without this the minifier strips the slash off <path/>, and the HTML parser then nests
    // each following path inside the previous one, multiplying their opacities.
    keepClosingSlash: true,
  })
}
