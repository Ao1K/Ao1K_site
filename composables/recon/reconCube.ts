import { DEFAULT_HINT_FACELETS_ELEVATION } from '../useSettings';
import { parseMoveRotation, type RotationInfo } from '../../utils/cubeMoves';
import { CUBE_PX, SCENE_PX, type SceneView } from '../../utils/cubeSvgRender';

const CAMERA_FOV_DEG = 75;

export const smootherStep = (x: number) => x * x * x * (10 - x * (15 - 6 * x));

export const turnRotation = (move: string): RotationInfo | null => {
  if (!move.includes('3')) return parseMoveRotation(move);
  const quarterTurn = parseMoveRotation(move.replace('3', ''));
  return quarterTurn && { ...quarterTurn, angle: quarterTurn.angle * 3 };
};

export const timelineMoveMs = (move: string) => {
  if (move.includes('3')) return 2000;
  if (move.includes('2')) return 1500;
  return 1000;
};

// rebuilds the Three.js camera from TwistyPlayer: a 75° field of view at the same camera distance. The SVG renderer has no camera, so the distance becomes a cube scale and a perspective depth.
export const cameraView = (containerHeight: number, elevation: number, zoom: number): SceneView => {
  const heightScale = (containerHeight * 0.0024) + 0.92;
  const elevationZoom = 1 + (elevation - DEFAULT_HINT_FACELETS_ELEVATION) * 0.1;
  const cameraDistance = heightScale * elevationZoom / zoom;
  const visibleHeight = 2 * cameraDistance * Math.tan((CAMERA_FOV_DEG / 2) * Math.PI / 180);
  return {
    hintElevation: elevation,
    cubeScale: SCENE_PX / (CUBE_PX * visibleHeight),
    perspective: cameraDistance * CUBE_PX,
  };
};
