'use server'

import { minify } from 'html-minifier-terser'
import type { Color } from '../composables/recon/SimpleCube'
import type { CubeColors } from '../composables/useSettings'
import type { CompileSceneOptions, CompileStaticImageOptions } from './devActionTypes'

type RotationInfo = { axis: 'x' | 'y' | 'z'; layers: number[]; angle: number }

const CUBIE_PX = 100
const HINT_OFFSET = CUBIE_PX // distance (px) hint facelets float outside the regular sticker (~1 sticker)
const LABEL_OFFSET = 50 // distance (px) face direction labels float outside the cube
const LABEL_SIZE = Math.round(CUBIE_PX * 1.5) // face label container size (50% larger than a sticker)

const MOVE_TABLE: Record<string, { axis: 'x' | 'y' | 'z'; layers: number[]; baseSign: number }> = {
  U: { axis: 'y', layers: [-1], baseSign: -1 },
  D: { axis: 'y', layers: [+1], baseSign: +1 },
  R: { axis: 'x', layers: [+1], baseSign: +1 },
  L: { axis: 'x', layers: [-1], baseSign: -1 },
  F: { axis: 'z', layers: [+1], baseSign: +1 },
  B: { axis: 'z', layers: [-1], baseSign: -1 },
  M: { axis: 'x', layers: [0], baseSign: -1 },
  E: { axis: 'y', layers: [0], baseSign: +1 },
  S: { axis: 'z', layers: [0], baseSign: +1 },
  u: { axis: 'y', layers: [-1, 0], baseSign: -1 },
  d: { axis: 'y', layers: [+1, 0], baseSign: +1 },
  r: { axis: 'x', layers: [+1, 0], baseSign: +1 },
  l: { axis: 'x', layers: [-1, 0], baseSign: -1 },
  f: { axis: 'z', layers: [+1, 0], baseSign: +1 },
  b: { axis: 'z', layers: [-1, 0], baseSign: -1 },
  x: { axis: 'x', layers: [-1, 0, +1], baseSign: +1 },
  y: { axis: 'y', layers: [-1, 0, +1], baseSign: -1 },
  z: { axis: 'z', layers: [-1, 0, +1], baseSign: +1 },
}

function parseMoveRotation(moveStr: string): RotationInfo | null {
  if (!moveStr) return null
  const entry = MOVE_TABLE[moveStr[0]]
  if (!entry) return null
  const mod = moveStr.slice(1)
  let multiplier: number
  if (mod === '' || mod === "3'") multiplier = 1
  else if (mod === "'" || mod === '3') multiplier = -1
  else if (mod === '2' || mod === "2'") multiplier = 2
  else return null
  const angle = multiplier === 2 ? 180 : entry.baseSign * multiplier * 90
  return { axis: entry.axis, layers: entry.layers, angle }
}

function buildColorHex(c: CubeColors): Record<Color, string> {
  return { W: c.up, Y: c.down, G: c.front, R: c.right, B: c.back, O: c.left }
}

// inline svgs for face direction labels — keeps the compiled HTML self-contained.
const FACE_LABEL_SVGS: Record<string, string> = {
  U: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text x="50" y="50" font-family="sans-serif" font-size="64" font-weight="bold" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">U</text></svg>`,
  D: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text x="50" y="50" font-family="sans-serif" font-size="64" font-weight="bold" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">D</text></svg>`,
  R: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text x="50" y="50" font-family="sans-serif" font-size="64" font-weight="bold" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">R</text></svg>`,
  L: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text x="50" y="50" font-family="sans-serif" font-size="64" font-weight="bold" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">L</text></svg>`,
  F: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text x="50" y="50" font-family="sans-serif" font-size="64" font-weight="bold" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">F</text></svg>`,
  B: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text x="50" y="50" font-family="sans-serif" font-size="64" font-weight="bold" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">B</text></svg>`,
}

function svgDataUrl(svg: string): string {
  // url-encode the SVG so it can sit inside CSS / src attributes without quoting issues
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22')
  return `data:image/svg+xml;utf8,${encoded}`
}

function buildSceneHtml(opts: CompileSceneOptions): string {
  const { initialState, lines, angles, cubeColors, showProgressBar, showFacelets, showFaceLabels, loopPlayback, backgroundColor, shadeColor, startHighlighted, standalone } = opts
  const HALF = CUBIE_PX / 2
  const CUBE = CUBIE_PX * 3
  const SCENE = 640
  const offset = (SCENE - CUBE) / 2
  const colorHex = buildColorHex(cubeColors)

  // encode the initial cube state as a 54-char string in face order (up,down,front,right,back,left),
  // so the runtime JS builds cubies on the fly instead of inlining ~25 cubies of static markup.
  let stateString = ''
  for (let face = 0; face < 6; face++) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        stateString += initialState[face][row][col]
      }
    }
  }

  // face direction labels (one per cube face) — children of .cube so they rotate with it
  const faceLabelsHtml = showFaceLabels
    ? Object.entries({
        U: `transform:translate3d(0,${-CUBE / 2 - LABEL_OFFSET}px,0) rotateX(90deg)`,
        D: `transform:translate3d(0,${CUBE / 2 + LABEL_OFFSET}px,0) rotateX(-90deg)`,
        R: `transform:translate3d(${CUBE / 2 + LABEL_OFFSET}px,0,0) rotateY(90deg)`,
        L: `transform:translate3d(${-CUBE / 2 - LABEL_OFFSET}px,0,0) rotateY(-90deg)`,
        F: `transform:translate3d(0,0,${CUBE / 2 + LABEL_OFFSET}px)`,
        B: `transform:translate3d(0,0,${-CUBE / 2 - LABEL_OFFSET}px) rotateY(180deg)`,
      })
        .map(([face, transform]) =>
          `<div class="face-label" style="${transform};background-image:url('${svgDataUrl(FACE_LABEL_SVGS[face])}')"></div>`,
        )
        .join('')
    : ''

  // compile the per-line move data for the runtime script.
  // parse move strings into rotation infos, dropping any unparseable moves.
  const lineData = lines.map(line => {
    const moves: RotationInfo[] = []
    const moveDurationsMs: number[] = []
    line.moves.forEach((mv, i) => {
      const r = parseMoveRotation(mv)
      if (!r) return
      moves.push(r)
      moveDurationsMs.push(line.moveDurationsMs[i] ?? 550)
    })
    return { moves, moveDurationsMs, delayMs: line.delayMs, highlight: line.highlight }
  })
  const totalMoves = lineData.reduce((s, l) => s + l.moves.length, 0)
  const useHighlight = lines.some(l => l.highlight !== null)

  const progressCss = showProgressBar
    ? `.progress{position:absolute;bottom:0;left:0;width:100%;height:6px;background:rgba(255,255,255,0.1);z-index:2}.progress-fill{height:100%;width:0%;background:#e00}`
    : ''
  const progressHtml = showProgressBar ? `<div class="progress"><div class="progress-fill"></div></div>` : ''

  const PLAY_PATH = `M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z`

  // face label / hint css conditionals
  const labelCss = showFaceLabels
    ? `.face-label{position:absolute;left:${(CUBE - LABEL_SIZE) / 2}px;top:${(CUBE - LABEL_SIZE) / 2}px;width:${LABEL_SIZE}px;height:${LABEL_SIZE}px;background-size:contain;background-repeat:no-repeat;background-position:center;pointer-events:none;backface-visibility:hidden;-webkit-backface-visibility:hidden}`
    : ''
  const hintCss = showFacelets
    ? `.hint{position:absolute;left:3px;top:3px;width:${CUBIE_PX - 6}px;height:${CUBIE_PX - 6}px;box-sizing:border-box;border:2px solid rgba(0,0,0,0.25);opacity:0.55;pointer-events:none;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.hint.up{transform:rotateX(-90deg) translateZ(${-HALF - HINT_OFFSET}px)}
.hint.down{transform:rotateX(90deg) translateZ(${-HALF - HINT_OFFSET}px)}
.hint.front{transform:rotateY(180deg) translateZ(${-HALF - HINT_OFFSET}px)}
.hint.back{transform:translateZ(${-HALF - HINT_OFFSET}px)}
.hint.right{transform:rotateY(-90deg) translateZ(${-HALF - HINT_OFFSET}px)}
.hint.left{transform:rotateY(90deg) translateZ(${-HALF - HINT_OFFSET}px)}`
    : ''
  // shade unhighlighted pieces by overlaying the chosen color (its alpha controls transparency).
  // a transition-able overlay keeps the .3s fade when the highlight set changes between lines.
  // the hint overlay uses -2px inset to cover its semi-transparent border, otherwise the original
  // sticker color bleeds through the border ring.
  const dimCss = useHighlight
    ? `.cubie .face::after,.cubie .hint::after{content:"";position:absolute;background:${shadeColor};opacity:0;transition:opacity .3s;pointer-events:none}.cubie .face::after{inset:0}.cubie .hint::after{inset:-2px}.cubie.dim .face::after,.cubie.dim .hint::after{opacity:1}`
    : ''

  const sharedCss = `.scene{perspective:1000px;width:${SCENE}px;height:${SCENE}px;position:relative;cursor:pointer}
.cube{position:absolute;width:${CUBE}px;height:${CUBE}px;left:${offset}px;top:${offset}px;transform-style:preserve-3d;transform:scale(0.85) rotateX(${-angles.x}deg) rotateY(${-angles.y}deg)}
.cubie{position:absolute;width:${CUBIE_PX}px;height:${CUBIE_PX}px;left:${CUBIE_PX}px;top:${CUBIE_PX}px;transform-style:preserve-3d}
.cubie .face,.cubie .hint{transition:opacity .3s}
.rotator{position:absolute;width:100%;height:100%;left:0;top:0;transform-style:preserve-3d;transition:transform .55s ease-in-out}
.face{position:absolute;width:${CUBIE_PX}px;height:${CUBIE_PX}px;box-sizing:border-box;border:3px solid #000;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.face.up{transform:rotateX(90deg) translateZ(${HALF}px)}
.face.down{transform:rotateX(-90deg) translateZ(${HALF}px)}
.face.front{transform:translateZ(${HALF}px)}
.face.back{transform:rotateY(180deg) translateZ(${HALF}px)}
.face.right{transform:rotateY(90deg) translateZ(${HALF}px)}
.face.left{transform:rotateY(-90deg) translateZ(${HALF}px)}
${hintCss}
${labelCss}
${dimCss}
.overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;transition:background .2s}
.icon-play{position:absolute;width:72px;height:72px;fill:white;opacity:0;transition:opacity .2s;pointer-events:none}
${progressCss}`

  const sceneEl = `<div class="scene"><div class="cube">${faceLabelsHtml}</div><div class="overlay"><svg class="icon-play" viewBox="0 0 256 256"><path d="${PLAY_PATH}"/></svg></div>${progressHtml}</div>`

  const progressInit = showProgressBar ? `var pf=document.querySelector('.progress-fill');` : `var pf=null;`
  const progressApply = showProgressBar
    ? `if(pf){pf.style.transition='width '+turnMs+'ms linear';pf.style.width=((movesPlayed+1)/totalMoves*100)+'%';}`
    : ''
  const progressReset = showProgressBar ? `if(pf){pf.style.transition='none';pf.style.width='0%';}` : ''

  const scriptEl = `<script>
const CUBIE=${CUBIE_PX};
const lines=${JSON.stringify(lineData)};
const totalMoves=${totalMoves};
const CYCLE_PAUSE_END_MS=1000,CYCLE_PAUSE_START_MS=600;
const sceneEl=document.querySelector('.scene');
const cubeEl=document.querySelector('.cube');
const overlayEl=document.querySelector('.overlay');
const iconPlay=overlayEl.querySelector('.icon-play');
const cubies=[];
(function() {
  var state = ${JSON.stringify(stateString)};
  var hexMap = ${JSON.stringify(colorHex)};
  var showHints = ${showFacelets};
  var faceNames = ['up', 'down', 'front', 'right', 'back', 'left'];

  // canonical piece name: leading W/Y (if any), then remaining colors sorted
  function getPieceName(colors) {
    var primary = colors.indexOf('W') >= 0 ? 'W' : (colors.indexOf('Y') >= 0 ? 'Y' : '');
    var rest = colors.filter(function(c) { return c !== 'W' && c !== 'Y'; }).sort().join('');
    return primary + rest;
  }

  for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;

    // collect visible [faceIndex, stickerIndex] pairs for this cubie
    var faces = [];
    if (y === -1) faces.push([0, (z + 1) * 3 + x + 1]); // up
    if (y === 1)  faces.push([1, (1 - z) * 3 + x + 1]); // down
    if (z === 1)  faces.push([2, (y + 1) * 3 + x + 1]); // front
    if (x === 1)  faces.push([3, (y + 1) * 3 + 1 - z]); // right
    if (z === -1) faces.push([4, (y + 1) * 3 + 1 - x]); // back
    if (x === -1) faces.push([5, (y + 1) * 3 + z + 1]); // left

    var colors = faces.map(function(f) { return state[f[0] * 9 + f[1]]; });
    var pieceName = getPieceName(colors);
    var transform = 'translate3d(' + (x * CUBIE) + 'px,' + (y * CUBIE) + 'px,' + (z * CUBIE) + 'px)';

    var cubieEl = document.createElement('div');
    cubieEl.className = 'cubie';
    cubieEl.style.transform = transform;

    faces.forEach(function(f) {
      var hex = hexMap[state[f[0] * 9 + f[1]]];
      var faceEl = document.createElement('div');
      faceEl.className = 'face ' + faceNames[f[0]];
      faceEl.style.background = hex;
      cubieEl.appendChild(faceEl);
      if (showHints) {
        var hintEl = document.createElement('div');
        hintEl.className = 'hint ' + faceNames[f[0]];
        hintEl.style.background = hex;
        cubieEl.appendChild(hintEl);
      }
    });

    cubeEl.appendChild(cubieEl);
    cubies.push({ el: cubieEl, piece: pieceName, pos: [x, y, z], initialPos: [x, y, z], transform: transform, initialTransform: transform });
  }
})();
${progressInit}
function rotatePos(pos,axis,angle){var x=pos[0],y=pos[1],z=pos[2],c=Math.round(Math.cos(angle*Math.PI/180)),s=Math.round(Math.sin(angle*Math.PI/180));if(axis==='x')return[x,c*y-s*z,s*y+c*z];if(axis==='y')return[c*x+s*z,y,-s*x+c*z];return[c*x-s*y,s*x+c*y,z];}
function setHighlight(set){cubies.forEach(function(c){if(set&&set.indexOf(c.piece)===-1){c.el.classList.add('dim');}else{c.el.classList.remove('dim');}});}
var startHighlighted=${startHighlighted};
// highlight shown while idle / between loops; first line's highlight when "start highlighted" is on
function restHighlight(){return startHighlighted&&lines.length?lines[0].highlight:null;}
setHighlight(restHighlight());
var paused=true,animating=false,timeoutId=null,lineIdx=0,moveIdx=0,movesPlayed=0;
function updateOverlay(){if(paused){overlayEl.style.background='rgba(0,0,0,0.45)';iconPlay.style.opacity='0.85';}else{overlayEl.style.background='transparent';iconPlay.style.opacity='0';}}
function clearPending(){if(timeoutId){clearTimeout(timeoutId);timeoutId=null;}}
function playLine(idx){
  if(paused)return;
  lineIdx=idx;moveIdx=0;
  if(idx>=lines.length){${loopPlayback ? `timeoutId=setTimeout(reset,CYCLE_PAUSE_END_MS);` : `paused=true;updateOverlay();`}return;}
  var line=lines[idx];
  setHighlight(line.highlight);
  timeoutId=setTimeout(function(){
    if(paused)return;
    if(line.moves.length===0){playLine(idx+1);return;}
    playMove(idx,0);
  },line.delayMs||0);
}
function playMove(idx,mi){
  if(paused)return;
  lineIdx=idx;moveIdx=mi;
  var line=lines[idx];
  if(mi>=line.moves.length){playLine(idx+1);return;}
  var m=line.moves[mi];
  var turnMs=line.moveDurationsMs[mi]||550;
  ${progressApply}
  applyMove(m,turnMs,function(){
    movesPlayed++;
    moveIdx=mi+1;
    if(paused)return;
    playMove(idx,mi+1);
  });
}
function applyMove(m,turnMs,done){
  animating=true;
  var fn=m.axis==='x'?'rotateX':m.axis==='y'?'rotateY':'rotateZ';
  var endRot=fn+'('+m.angle+'deg)';
  var axisIdx=m.axis==='x'?0:m.axis==='y'?1:2;
  var affected=cubies.filter(function(c){return m.layers.indexOf(c.pos[axisIdx])!==-1;});
  var wrapper=document.createElement('div');
  wrapper.className='rotator';
  wrapper.style.transition='none';
  wrapper.style.transform=fn+'(0deg)';
  cubeEl.appendChild(wrapper);
  affected.forEach(function(c){wrapper.appendChild(c.el);});
  void wrapper.offsetWidth;
  wrapper.style.transition='transform '+turnMs+'ms ease-in-out';
  wrapper.style.transform=endRot;
  setTimeout(function(){
    affected.forEach(function(c){c.transform=endRot+' '+c.transform;c.el.style.transform=c.transform;cubeEl.appendChild(c.el);c.pos=rotatePos(c.pos,m.axis,m.angle);});
    if(wrapper.parentNode)wrapper.parentNode.removeChild(wrapper);
    animating=false;
    done&&done();
  },turnMs);
}
function reset(){
  ${progressReset}
  cubies.forEach(function(c){c.pos=c.initialPos.slice();c.transform=c.initialTransform;c.el.style.transform=c.transform;});
  setHighlight(restHighlight());
  lineIdx=0;moveIdx=0;movesPlayed=0;
  if(paused){updateOverlay();return;}
  timeoutId=setTimeout(function(){playLine(0);},CYCLE_PAUSE_START_MS);
}
if(totalMoves>0){
  updateOverlay();
  sceneEl.addEventListener('click',function(){
    paused=!paused;updateOverlay();
    if(paused){clearPending();return;}
    if(animating)return;
    if(lineIdx>=lines.length){reset();}
    else if(moveIdx===0){timeoutId=setTimeout(function(){playLine(lineIdx);},CYCLE_PAUSE_START_MS);}
    else{timeoutId=setTimeout(function(){playMove(lineIdx,moveIdx);},CYCLE_PAUSE_START_MS);}
  });
}
</script>`

  if (!standalone) {
    return `<style>${sharedCss}</style>${sceneEl}${scriptEl}`
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cube Scene</title>
<style>
body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:${backgroundColor}}
${sharedCss}
</style>
</head>
<body>
${sceneEl}
${scriptEl}
</body>
</html>`
}

export async function compileCubeScene(opts: CompileSceneOptions): Promise<string> {
  return minify(buildSceneHtml(opts), {
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: true,
    removeComments: true,
  })
}

function buildStaticImageHtml(opts: CompileStaticImageOptions): string {
  const { initialState, angles, cubeColors, showFacelets, showFaceLabels, backgroundColor, shadeColor, standalone, highlight } = opts
  const HALF = CUBIE_PX / 2
  const CUBE = CUBIE_PX * 3
  const SCENE = 640
  const offset = (SCENE - CUBE) / 2
  const colorHex = buildColorHex(cubeColors)

  const faceNames = ['up', 'down', 'front', 'right', 'back', 'left'] as const
  const highlightSet = highlight ? new Set(highlight) : null

  // canonical piece name from colors: leading W/Y (if any) then remaining colors sorted.
  // mirrors the runtime getPieceName in buildSceneHtml so highlight names match.
  const pieceNameOf = (colors: Color[]): string => {
    const primary = colors.includes('W') ? 'W' : colors.includes('Y') ? 'Y' : ''
    const rest = colors.filter(c => c !== 'W' && c !== 'Y').slice().sort().join('')
    return primary + rest
  }

  // pre-render cubies as static markup using the supplied cube state
  const cubieParts: string[] = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue
        const stickers: Array<[number, number]> = []
        if (y === -1) stickers.push([0, (z + 1) * 3 + x + 1])
        if (y === 1)  stickers.push([1, (1 - z) * 3 + x + 1])
        if (z === 1)  stickers.push([2, (y + 1) * 3 + x + 1])
        if (x === 1)  stickers.push([3, (y + 1) * 3 + 1 - z])
        if (z === -1) stickers.push([4, (y + 1) * 3 + 1 - x])
        if (x === -1) stickers.push([5, (y + 1) * 3 + z + 1])

        const cubieColors: Color[] = []
        const inner: string[] = []
        for (const [faceIdx, stickerIdx] of stickers) {
          const row = Math.floor(stickerIdx / 3)
          const col = stickerIdx % 3
          const color = initialState[faceIdx][row][col]
          cubieColors.push(color)
          const hex = colorHex[color]
          const faceName = faceNames[faceIdx]
          inner.push(`<div class="face ${faceName}" style="background:${hex}"></div>`)
          if (showFacelets) {
            inner.push(`<div class="hint ${faceName}" style="background:${hex}"></div>`)
          }
        }

        const transform = `translate3d(${x * CUBIE_PX}px,${y * CUBIE_PX}px,${z * CUBIE_PX}px)`
        const isDim = highlightSet && !highlightSet.has(pieceNameOf(cubieColors))
        const cubieClass = isDim ? 'cubie dim' : 'cubie'
        cubieParts.push(`<div class="${cubieClass}" style="transform:${transform}">${inner.join('')}</div>`)
      }
    }
  }

  const faceLabelsHtml = showFaceLabels
    ? Object.entries({
        U: `transform:translate3d(0,${-CUBE / 2 - LABEL_OFFSET}px,0) rotateX(90deg)`,
        D: `transform:translate3d(0,${CUBE / 2 + LABEL_OFFSET}px,0) rotateX(-90deg)`,
        R: `transform:translate3d(${CUBE / 2 + LABEL_OFFSET}px,0,0) rotateY(90deg)`,
        L: `transform:translate3d(${-CUBE / 2 - LABEL_OFFSET}px,0,0) rotateY(-90deg)`,
        F: `transform:translate3d(0,0,${CUBE / 2 + LABEL_OFFSET}px)`,
        B: `transform:translate3d(0,0,${-CUBE / 2 - LABEL_OFFSET}px) rotateY(180deg)`,
      })
        .map(([face, transform]) =>
          `<div class="face-label" style="${transform};background-image:url('${svgDataUrl(FACE_LABEL_SVGS[face])}')"></div>`,
        )
        .join('')
    : ''

  const labelCss = showFaceLabels
    ? `.face-label{position:absolute;left:${(CUBE - LABEL_SIZE) / 2}px;top:${(CUBE - LABEL_SIZE) / 2}px;width:${LABEL_SIZE}px;height:${LABEL_SIZE}px;background-size:contain;background-repeat:no-repeat;background-position:center;pointer-events:none;backface-visibility:hidden;-webkit-backface-visibility:hidden}`
    : ''
  const hintCss = showFacelets
    ? `.hint{position:absolute;left:3px;top:3px;width:${CUBIE_PX - 6}px;height:${CUBIE_PX - 6}px;box-sizing:border-box;border:2px solid rgba(0,0,0,0.25);opacity:0.55;pointer-events:none;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.hint.up{transform:rotateX(-90deg) translateZ(${-HALF - HINT_OFFSET}px)}
.hint.down{transform:rotateX(90deg) translateZ(${-HALF - HINT_OFFSET}px)}
.hint.front{transform:rotateY(180deg) translateZ(${-HALF - HINT_OFFSET}px)}
.hint.back{transform:translateZ(${-HALF - HINT_OFFSET}px)}
.hint.right{transform:rotateY(-90deg) translateZ(${-HALF - HINT_OFFSET}px)}
.hint.left{transform:rotateY(90deg) translateZ(${-HALF - HINT_OFFSET}px)}`
    : ''

  // shade unhighlighted pieces by overlaying the chosen color (its alpha controls transparency).
  // the hint overlay uses -2px inset to cover its semi-transparent border, otherwise the original
  // sticker color bleeds through the border ring.
  const dimCss = highlightSet
    ? `.cubie.dim .face::after,.cubie.dim .hint::after{content:"";position:absolute;background:${shadeColor};pointer-events:none}.cubie.dim .face::after{inset:0}.cubie.dim .hint::after{inset:-2px}`
    : ''

  const sharedCss = `.scene{perspective:1000px;width:${SCENE}px;height:${SCENE}px;position:relative}
.cube{position:absolute;width:${CUBE}px;height:${CUBE}px;left:${offset}px;top:${offset}px;transform-style:preserve-3d;transform:scale(0.85) rotateX(${-angles.x}deg) rotateY(${-angles.y}deg)}
.cubie{position:absolute;width:${CUBIE_PX}px;height:${CUBIE_PX}px;left:${CUBIE_PX}px;top:${CUBIE_PX}px;transform-style:preserve-3d}
.face{position:absolute;width:${CUBIE_PX}px;height:${CUBIE_PX}px;box-sizing:border-box;border:3px solid #000;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.face.up{transform:rotateX(90deg) translateZ(${HALF}px)}
.face.down{transform:rotateX(-90deg) translateZ(${HALF}px)}
.face.front{transform:translateZ(${HALF}px)}
.face.back{transform:rotateY(180deg) translateZ(${HALF}px)}
.face.right{transform:rotateY(90deg) translateZ(${HALF}px)}
.face.left{transform:rotateY(-90deg) translateZ(${HALF}px)}
${hintCss}
${labelCss}
${dimCss}`

  const sceneEl = `<div class="scene"><div class="cube">${faceLabelsHtml}${cubieParts.join('')}</div></div>`

  if (!standalone) {
    return `<style>${sharedCss}</style>${sceneEl}`
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cube Image</title>
<style>
body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:${backgroundColor}}
${sharedCss}
</style>
</head>
<body>
${sceneEl}
</body>
</html>`
}

export async function compileStaticCubeImage(opts: CompileStaticImageOptions): Promise<string> {
  return minify(buildStaticImageHtml(opts), {
    collapseWhitespace: true,
    minifyCSS: true,
    removeComments: true,
  })
}
