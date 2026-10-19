import { SimpleCube } from './SimpleCube';
import { movesFromText } from './parseMovesText';
import { cameraView, CUBE_CONTAINER_NAME, INITIAL_ANGLES, STICKER_ELEVATION } from './reconCube';
import { faceletsFromState, stateFromFacelets } from '../../utils/cubeMoves';
import { CUBE_SVG_CLASS } from '../../utils/cubeSceneIsland';
import { buildColorHex, DEFAULT_SCENE_LOOK } from '../../utils/cubeSceneAuthoring';
import { cubeLooks, cubiesFromState, renderSceneMarkup, restingWorld, sceneGeometry } from '../../utils/cubeSvgRender';
import { DEFAULT_CUBE_COLORS, DEFAULT_HINT_FACELETS_ELEVATION, type CubeColors } from '../../utils/sharedConstants';

export type CubePrerender = { facelets: string; markup: string };

export type ReconCubeStart = {
  scramble: string;
  solution: string;
  dailyScramble: string;
  solutionEditorAutofocus: boolean;
};

const PHONE_BOX_PX = 218;
const DESKTOP_BOX_PX = 384;
const MIN_BOX_PX = 200;
const BOX_STEP_PX = 8;
const MAX_MOVES_TEXT_LENGTH = 2000;

function startingMoves({ scramble, solution, dailyScramble, solutionEditorAutofocus }: ReconCubeStart): string[] {
  if (scramble) return movesFromText(scramble);
  if (!solution) return movesFromText(dailyScramble);
  return solutionEditorAutofocus ? movesFromText(solution) : [];
}

function cubeSettingsFromCookie(settingsCookie: string | undefined): { colors: CubeColors; elevation: number } {
  const defaults = { colors: DEFAULT_CUBE_COLORS, elevation: DEFAULT_HINT_FACELETS_ELEVATION };
  if (!settingsCookie) return defaults;
  try {
    const parsed = JSON.parse(settingsCookie);
    return {
      colors: { ...DEFAULT_CUBE_COLORS, ...parsed.cubeColors },
      elevation: typeof parsed.hintFaceletsElevation === 'number' ? parsed.hintFaceletsElevation : DEFAULT_HINT_FACELETS_ELEVATION,
    };
  } catch {
    return defaults;
  }
}

function sizeFixCss(referenceBoxPx: number, elevation: number): string {
  const referenceScale = cameraView(referenceBoxPx, elevation, 1).cubeScale;
  let css = '';
  for (let boxPx = MIN_BOX_PX; boxPx <= DESKTOP_BOX_PX; boxPx += BOX_STEP_PX) {
    const sampleBoxPx = Math.min(boxPx + BOX_STEP_PX / 2, DESKTOP_BOX_PX);
    const scale = cameraView(sampleBoxPx, elevation, 1).cubeScale / referenceScale;
    css += `@container ${CUBE_CONTAINER_NAME} (min-height:${boxPx}px){.${CUBE_SVG_CLASS}{transform:scale(${scale.toFixed(4)})}}`;
  }
  return css;
}

export function prerenderReconCube(start: ReconCubeStart, settingsCookie: string | undefined, isPhone: boolean): CubePrerender | null {
  if (start.scramble.length > MAX_MOVES_TEXT_LENGTH || start.solution.length > MAX_MOVES_TEXT_LENGTH) return null;

  const { colors, elevation } = cubeSettingsFromCookie(settingsCookie);
  const facelets = faceletsFromState(new SimpleCube().getCubeState(startingMoves(start)));
  const referenceBoxPx = isPhone ? PHONE_BOX_PX : DESKTOP_BOX_PX;
  const geometry = sceneGeometry(INITIAL_ANGLES, {
    ...cameraView(referenceBoxPx, elevation, 1),
    hintElevation: STICKER_ELEVATION,
  });
  const cubeMarkup = renderSceneMarkup({
    geometry,
    looks: cubeLooks(buildColorHex(colors), DEFAULT_SCENE_LOOK.shade, DEFAULT_SCENE_LOOK.dim),
    showFacelets: elevation !== 0,
    showFaceLabels: true,
    cubies: cubiesFromState(stateFromFacelets(facelets)).map(cubie => ({
      stickers: cubie.stickers,
      world: restingWorld(geometry, cubie),
      dim: 0,
    })),
  });

  return { facelets, markup: `<style>${sizeFixCss(referenceBoxPx, elevation)}</style>${cubeMarkup}` };
}
