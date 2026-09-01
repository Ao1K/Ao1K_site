'use server'

import { minify } from 'html-minifier-terser'
import type { Color } from '../composables/recon/SimpleCube'
import type { CubeColors } from '../composables/useSettings'
import { buildCubeSvg, SCENE_PX } from '../utils/cubeSvgRender'
import { buildCubeSceneRuntimeJs, cubeSvgElement, CUBE_SVG_CLASS } from '../utils/cubeSceneRuntime'
import type { CompileSceneOptions, CompileStaticImageOptions } from './devActionTypes'

type RotationInfo = { axis: 'x' | 'y' | 'z'; layers: number[]; angle: number }

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

function buildSceneHtml(opts: CompileSceneOptions): string {
  const { initialState, lines, angles, cubeColors, showProgressBar, showFacelets, showFaceLabels, loopPlayback, backgroundColor, shadeColor, dimOpacity, startHighlighted, standalone } = opts

  const runtimeJs = buildCubeSceneRuntimeJs({
    state: initialState,
    angles,
    colorHex: buildColorHex(cubeColors),
    showFacelets,
    showFaceLabels,
    shadeColor,
    dimOpacity,
  })

  // compile the per-line move data for the runtime script.
  // parse move strings into rotation infos, dropping any unparseable moves.
  const lineData = lines.map(line => {
    const moves: RotationInfo[][] = []
    const moveDurationsMs: number[] = []
    line.moveGroups.forEach((group, i) => {
      const rotations = group
        .map(parseMoveRotation)
        .filter((r): r is RotationInfo => r !== null)
      if (rotations.length === 0) return
      moves.push(rotations)
      moveDurationsMs.push(line.moveDurationsMs[i] ?? 550)
    })
    return { moves, moveDurationsMs, delayMs: line.delayMs, highlight: line.highlight }
  })
  const totalMoves = lineData.reduce((s, l) => s + l.moves.length, 0)

  const progressCss = showProgressBar
    ? `.progress{position:absolute;bottom:0;left:0;width:100%;height:6px;background:rgba(255,255,255,0.1);z-index:2}.progress-fill{height:100%;width:0%;background:#e00}`
    : ''
  const progressHtml = showProgressBar ? `<div class="progress"><div class="progress-fill"></div></div>` : ''

  const PLAY_PATH = `M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z`

  const sharedCss = `.scene{width:${SCENE_PX}px;height:${SCENE_PX}px;position:relative;cursor:pointer}
.${CUBE_SVG_CLASS}{display:block;width:100%;height:100%}
.overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;transition:background .2s}
.icon-play{position:absolute;width:72px;height:72px;fill:white;opacity:0;transition:opacity .2s;pointer-events:none}
${progressCss}`

  const sceneEl = `<div class="scene">${cubeSvgElement()}<div class="overlay"><svg class="icon-play" viewBox="0 0 256 256"><path d="${PLAY_PATH}"/></svg></div>${progressHtml}</div>`

  const progressInit = showProgressBar ? `var pf=document.querySelector('.progress-fill');` : `var pf=null;`
  const progressApply = showProgressBar
    ? `if(pf){pf.style.transition='width '+turnMs+'ms linear';pf.style.width=((movesPlayed+1)/totalMoves*100)+'%';}`
    : ''
  const progressReset = showProgressBar ? `if(pf){pf.style.transition='none';pf.style.width='0%';}` : ''

  const scriptEl = `<script>
${runtimeJs}
var lines=${JSON.stringify(lineData)};
var totalMoves=${totalMoves};
var CYCLE_PAUSE_END_MS=1000,CYCLE_PAUSE_START_MS=600,DIM_FADE_MS=300;
var sceneEl=document.querySelector('.scene');
var overlayEl=document.querySelector('.overlay');
var iconPlay=overlayEl.querySelector('.icon-play');
${progressInit}
function bezierPoint(t,a,b){var u=1-t;return 3*u*u*t*a+3*u*t*t*b+t*t*t;}
function bezierEase(x1,y1,x2,y2){
  return function(x){
    if(x<=0)return 0;
    if(x>=1)return 1;
    var lo=0,hi=1,t;
    for(var i=0;i<24;i++){t=(lo+hi)/2;if(bezierPoint(t,x1,x2)<x)lo=t;else hi=t;}
    return bezierPoint((lo+hi)/2,y1,y2);
  };
}
var easeMove=bezierEase(0.42,0,0.58,1);
var easeFade=bezierEase(0.25,0.1,0.25,1);
function rotatePos(pos,axis,angle){var x=pos[0],y=pos[1],z=pos[2],c=Math.round(Math.cos(angle*Math.PI/180)),s=Math.round(Math.sin(angle*Math.PI/180));if(axis==='x')return[x,c*y-s*z,s*y+c*z];if(axis==='y')return[c*x+s*z,y,-s*x+c*z];return[c*x-s*y,s*x+c*y,z];}
var moveAnim=null,rafId=0;
function scheduleFrame(){if(!rafId)rafId=requestAnimationFrame(frame);}
function frame(now){
  rafId=0;
  var busy=false;
  if(moveAnim&&stepMove(now))busy=true;
  if(stepFades(now))busy=true;
  renderCube();
  if(busy||moveAnim)scheduleFrame();
}
function stepMove(now){
  var a=moveAnim,t,i,turn;
  if(!a.start)a.start=now;
  var p=a.turnMs>0?Math.min(1,(now-a.start)/a.turnMs):1;
  var eased=easeMove(p);
  for(t=0;t<a.turns.length;t++){
    turn=a.turns[t];
    var live=cubeRotation(turn.move.axis,turn.move.angle*eased);
    for(i=0;i<turn.affected.length;i++)turn.affected[i].live=live;
  }
  if(p<1)return true;
  for(t=0;t<a.turns.length;t++){
    turn=a.turns[t];
    var settled=cubeRotation(turn.move.axis,turn.move.angle);
    for(i=0;i<turn.affected.length;i++){
      var c=turn.affected[i];
      c.mat=mul(settled,c.mat);
      c.live=null;
      c.pos=rotatePos(c.pos,turn.move.axis,turn.move.angle);
    }
  }
  moveAnim=null;animating=false;
  if(a.done)a.done();
  return false;
}
function stepFades(now){
  var busy=false;
  for(var i=0;i<cubies.length;i++){
    var c=cubies[i];
    if(!c.fadeStart)continue;
    var p=Math.min(1,(now-c.fadeStart)/DIM_FADE_MS);
    c.dim=c.dimFrom+(c.dimTo-c.dimFrom)*easeFade(p);
    if(p<1)busy=true;else c.fadeStart=0;
  }
  return busy;
}
function setHighlight(set,animate){
  var now=performance.now();
  for(var i=0;i<cubies.length;i++){
    var c=cubies[i];
    var target=set&&set.indexOf(c.piece)===-1?1:0;
    if(target===c.dimTo)continue;
    c.dimTo=target;
    if(animate){c.dimFrom=c.dim;c.fadeStart=now;}
    else{c.dim=target;c.dimFrom=target;c.fadeStart=0;}
  }
}
var startHighlighted=${startHighlighted};
// highlight shown while idle / between loops; first line's highlight when "start highlighted" is on
function restHighlight(){return startHighlighted&&lines.length?lines[0].highlight:null;}
setHighlight(restHighlight(),false);
scheduleFrame();
var paused=true,animating=false,timeoutId=null,lineIdx=0,moveIdx=0,movesPlayed=0;
function updateOverlay(){if(paused){overlayEl.style.background='rgba(0,0,0,0.45)';iconPlay.style.opacity='0.85';}else{overlayEl.style.background='transparent';iconPlay.style.opacity='0';}}
function clearPending(){if(timeoutId){clearTimeout(timeoutId);timeoutId=null;}}
function playLine(idx){
  if(paused)return;
  lineIdx=idx;moveIdx=0;
  if(idx>=lines.length){${loopPlayback ? `timeoutId=setTimeout(reset,CYCLE_PAUSE_END_MS);` : `paused=true;updateOverlay();`}return;}
  var line=lines[idx];
  setHighlight(line.highlight,true);
  scheduleFrame();
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
  var group=line.moves[mi];
  var turnMs=line.moveDurationsMs[mi]||550;
  ${progressApply}
  applyMove(group,turnMs,function(){
    movesPlayed++;
    moveIdx=mi+1;
    if(paused)return;
    playMove(idx,mi+1);
  });
}
function applyMove(group,turnMs,done){
  animating=true;
  var turns=group.map(function(m){
    var axisIdx=m.axis==='x'?0:m.axis==='y'?1:2;
    return {move:m,affected:cubies.filter(function(c){return m.layers.indexOf(c.pos[axisIdx])!==-1;})};
  });
  moveAnim={turns:turns,turnMs:turnMs,start:0,done:done};
  scheduleFrame();
}
function reset(){
  ${progressReset}
  cubies.forEach(function(c){c.pos=c.home.slice();c.mat=c.place;c.live=null;});
  setHighlight(restHighlight(),true);
  scheduleFrame();
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
