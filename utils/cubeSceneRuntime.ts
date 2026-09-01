import type { Color, CubeState } from '../composables/recon/SimpleCube'
import {
  COLOR_ORDER,
  CUBE_PX,
  CUBIE_PX,
  FACE_BORDER_PX,
  HINT_BORDER_PX,
  HINT_PX,
  LABEL_FONT_PX,
  LABEL_SIZE,
  LABEL_STROKE_PX,
  SCENE_PX,
  cubeLooks,
  cubiePlacement,
  cubiesFromState,
  sceneGeometry,
} from './cubeSvgRender'

export type CubeSceneRuntimeOptions = {
  state: CubeState
  angles: { x: number; y: number }
  colorHex: Record<Color, string>
  showFacelets: boolean
  showFaceLabels: boolean
  shadeColor: string
  dimOpacity: number
}

function trimmedJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => (typeof entry === 'number' ? Math.round(entry * 1e6) / 1e6 : entry))
}

export const CUBE_SVG_CLASS = 'cube-svg'

export function cubeSvgElement(): string {
  return `<svg class="${CUBE_SVG_CLASS}" viewBox="0 0 ${SCENE_PX} ${SCENE_PX}" width="${SCENE_PX}" height="${SCENE_PX}"></svg>`
}

export function buildCubeSceneRuntimeJs(opts: CubeSceneRuntimeOptions): string {
  const geometry = sceneGeometry(opts.angles)
  const looks = cubeLooks(opts.colorHex, opts.shadeColor, opts.dimOpacity)
  const labels = opts.showFaceLabels ? geometry.labels : []

  const cubieData = cubiesFromState(opts.state).map(c => ({
    piece: c.piece,
    home: [c.x, c.y, c.z],
    place: cubiePlacement(c.x, c.y, c.z),
    stickers: c.stickers.map(s => [s.faceIndex, COLOR_ORDER.indexOf(s.color)]),
  }))

  return `
var PROJ=${trimmedJson(geometry.projection)};
var PLACE=${trimmedJson(geometry.placement)};
var FACE_M=${trimmedJson(geometry.faceLocal)};
var HINT_M=${trimmedJson(geometry.hintLocal)};
var LABELS=${trimmedJson(labels)};
var LOOK_FACE=${trimmedJson(looks.face)};
var LOOK_HINT=${trimmedJson(looks.hint)};
var CUBIE_DATA=${trimmedJson(cubieData)};
var CUBIE_SIZE=${CUBIE_PX},HINT_SIZE=${HINT_PX},LABEL_PX=${LABEL_SIZE};
var LABEL_FONT=${LABEL_FONT_PX},LABEL_STROKE=${LABEL_STROKE_PX};
var FACE_BORDER=${FACE_BORDER_PX},HINT_BORDER=${HINT_BORDER_PX},CUBE_MID=${CUBE_PX / 2};
var SHOW_HINTS=${opts.showFacelets};
var CULL_BACKFACES=true,DRAW_BACKFACES=false;
var svgEl=document.querySelector('.${CUBE_SVG_CLASS}');

function mul(a,b){
  var o=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  for(var r=0;r<4;r++)for(var c=0;c<4;c++)o[r][c]=a[r][0]*b[0][c]+a[r][1]*b[1][c]+a[r][2]*b[2][c]+a[r][3]*b[3][c];
  return o;
}
function applyPt(m,x,y,z){
  return [m[0][0]*x+m[0][1]*y+m[0][2]*z+m[0][3],m[1][0]*x+m[1][1]*y+m[1][2]*z+m[1][3],m[2][0]*x+m[2][1]*y+m[2][2]*z+m[2][3],m[3][0]*x+m[3][1]*y+m[3][2]*z+m[3][3]];
}
function translateM(x,y,z){return [[1,0,0,x],[0,1,0,y],[0,0,1,z],[0,0,0,1]];}
function axisRotation(axis,deg){
  var a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  if(axis==='x')return [[1,0,0,0],[0,c,-s,0],[0,s,c,0],[0,0,0,1]];
  if(axis==='y')return [[c,0,s,0],[0,1,0,0],[-s,0,c,0],[0,0,0,1]];
  return [[c,-s,0,0],[s,c,0,0],[0,0,1,0],[0,0,0,1]];
}
function cubeRotation(axis,deg){
  return mul(mul(translateM(CUBE_MID,CUBE_MID,0),axisRotation(axis,deg)),translateM(-CUBE_MID,-CUBE_MID,0));
}
function snap(n){return Math.round(n*10)/10;}
function coord(n){
  var t=String(snap(n));
  if(t.indexOf('0.')===0)return t.slice(1);
  if(t.indexOf('-0.')===0)return '-'+t.slice(2);
  return t;
}
function joinCoords(values){
  var out='',prev='';
  for(var i=0;i<values.length;i++){
    var t=coord(values[i]);
    var selfDelimiting=t[0]==='-'||(t[0]==='.'&&prev.indexOf('.')!==-1);
    if(i>0&&!selfDelimiting)out+=' ';
    out+=t;
    prev=t;
  }
  return out;
}
function ratio(n){return Math.round(n*10000)/10000;}
function corner(screen,x,y){var q=applyPt(screen,x,y,0);return [q[0]/q[3],q[1]/q[3]];}
function ringPath(screen,size,inset){
  var lo=inset,hi=size-inset;
  var pts=[corner(screen,lo,lo),corner(screen,hi,lo),corner(screen,hi,hi),corner(screen,lo,hi)];
  var steps=[];
  for(var i=1;i<pts.length;i++)steps.push(snap(snap(pts[i][0])-snap(pts[i-1][0])),snap(snap(pts[i][1])-snap(pts[i-1][1])));
  return 'M'+joinCoords(pts[0])+'l'+joinCoords(steps)+'Z';
}
function facesCamera(screen,size){
  var o=corner(screen,0,0),px=corner(screen,size,0),py=corner(screen,0,size);
  return (px[0]-o[0])*(py[1]-o[1])-(px[1]-o[1])*(py[0]-o[0])>0;
}
function lerp(from,to,t){return from+(to-from)*t;}
function lerpRgba(from,to,t){return {r:lerp(from.r,to.r,t),g:lerp(from.g,to.g,t),b:lerp(from.b,to.b,t),a:lerp(from.a,to.a,t)};}
function lerpLook(pair,t){
  return {
    frame:lerpRgba(pair.bright.frame,pair.dim.frame,t),
    fill:lerpRgba(pair.bright.fill,pair.dim.fill,t),
    opacity:lerp(pair.bright.opacity,pair.dim.opacity,t)
  };
}
function rgbString(c){return 'rgb('+Math.round(c.r)+','+Math.round(c.g)+','+Math.round(c.b)+')';}
function opacityAttr(v){return v>=1?'':' opacity="'+ratio(v)+'"';}
function quadMarkup(screen,size,look,border){
  var outer=ringPath(screen,size,0),inner=ringPath(screen,size,border);
  var fillHidesFrameCenter=look.fill.a>=1;
  var framePath=fillHidesFrameCenter
    ?'<path d="'+outer+'" fill="'+rgbString(look.frame)+'"'+opacityAttr(look.frame.a)+'></path>'
    :'<path d="'+outer+inner+'" fill-rule="evenodd" fill="'+rgbString(look.frame)+'"'+opacityAttr(look.frame.a)+'></path>';
  var fillPath='<path d="'+inner+'" fill="'+rgbString(look.fill)+'"'+opacityAttr(look.fill.a)+'></path>';
  return look.opacity>=1?framePath+fillPath:'<g opacity="'+ratio(look.opacity)+'">'+framePath+fillPath+'</g>';
}
function labelMarkup(screen,letter){
  var o=corner(screen,0,0),px=corner(screen,LABEL_PX,0),py=corner(screen,0,LABEL_PX);
  var m=[ratio((px[0]-o[0])/LABEL_PX),ratio((px[1]-o[1])/LABEL_PX),ratio((py[0]-o[0])/LABEL_PX),ratio((py[1]-o[1])/LABEL_PX),ratio(o[0]),ratio(o[1])].join(',');
  return '<text transform="matrix('+m+')" x="'+LABEL_PX/2+'" y="'+LABEL_PX/2+'" font-family="sans-serif" font-size="'+LABEL_FONT+'" font-weight="bold" fill="#fff" stroke="#000" stroke-width="'+LABEL_STROKE+'" paint-order="stroke" stroke-linejoin="round" text-anchor="middle" dominant-baseline="central">'+letter+'</text>';
}
var cubies=CUBIE_DATA.map(function(c){
  return {piece:c.piece,stickers:c.stickers,pos:c.home.slice(),home:c.home,place:c.place,mat:c.place,live:null,dim:0,dimFrom:0,dimTo:0,fadeStart:0};
});
var drawables=[];
function pushQuad(world,size,look,border,cull){
  var screen=mul(PROJ,world);
  if(cull&&!facesCamera(screen,size))return;
  drawables.push([applyPt(world,size/2,size/2,0)[2],quadMarkup(screen,size,look,border)]);
}
function renderCube(){
  drawables.length=0;
  var i,j;
  for(i=0;i<cubies.length;i++){
    var c=cubies[i];
    var world=mul(PLACE,c.live?mul(c.live,c.mat):c.mat);
    for(j=0;j<c.stickers.length;j++){
      var s=c.stickers[j];
      pushQuad(mul(world,FACE_M[s[0]]),CUBIE_SIZE,lerpLook(LOOK_FACE[s[1]],c.dim),FACE_BORDER,DRAW_BACKFACES);
      if(SHOW_HINTS)pushQuad(mul(world,HINT_M[s[0]]),HINT_SIZE,lerpLook(LOOK_HINT[s[1]],c.dim),HINT_BORDER,CULL_BACKFACES);
    }
  }
  for(i=0;i<LABELS.length;i++){
    var lw=mul(PLACE,LABELS[i].matrix),ls=mul(PROJ,lw);
    if(!facesCamera(ls,LABEL_PX))continue;
    drawables.push([applyPt(lw,LABEL_PX/2,LABEL_PX/2,0)[2],labelMarkup(ls,LABELS[i].letter)]);
  }
  drawables.sort(function(a,b){return a[0]-b[0];});
  var out='';
  for(i=0;i<drawables.length;i++)out+=drawables[i][1];
  svgEl.innerHTML=out;
}
`
}
