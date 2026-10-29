'use client';

import { useCallback, useState } from 'react';
import { createCubeScene, type CubeScene } from '../utils/cubeSceneRuntime.client';
import { createCanvasPainter } from '../utils/cubeCanvasRender';
import { buildColorHex, DEFAULT_SCENE_LOOK } from '../utils/cubeSceneAuthoring';
import { faceletsFromState } from '../utils/cubeMoves';
import { cameraView, INITIAL_ANGLES, ORBIT_DAMPING } from '../composables/recon/reconCube';
import { SimpleCube } from '../composables/recon/SimpleCube';
import type { CubeColors } from '../composables/useSettings';

const SOLVED_FACELETS = faceletsFromState(new SimpleCube().getCubeState([]));
const RECON_PLAYER_HEIGHT_PX = 384;

interface SettingsCubePreviewProps {
  cubeColors: CubeColors;
  elevation: number;
  stickerScale: number;
  cameraFov: number;
}

export default function SettingsCubePreview({ cubeColors, elevation, stickerScale, cameraFov }: SettingsCubePreviewProps) {
  const [scene, setScene] = useState<CubeScene | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  scene?.setLook({ colors: buildColorHex(cubeColors), hints: elevation !== 0 });
  scene?.setView(cameraView(RECON_PLAYER_HEIGHT_PX, elevation, 1, stickerScale, cameraFov));

  const attachCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;

    const newScene = createCubeScene(createCanvasPainter(canvas), {
      facelets: SOLVED_FACELETS,
      angles: INITIAL_ANGLES,
      colors: DEFAULT_SCENE_LOOK.colors,
      shade: DEFAULT_SCENE_LOOK.shade,
      dim: DEFAULT_SCENE_LOOK.dim,
      hints: true,
      labels: true,
      orbit: { target: canvas, damping: ORBIT_DAMPING },
    });
    setScene(newScene);

    const resizeObserver = new ResizeObserver(() => setCanvasSize({
      width: Math.round(canvas.clientWidth * devicePixelRatio),
      height: Math.round(canvas.clientHeight * devicePixelRatio),
    }));
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      newScene.destroy();
      setScene(null);
    };
  }, []);

  return (
    <canvas
      ref={attachCanvas}
      width={canvasSize.width}
      height={canvasSize.height}
      className="block aspect-video w-full touch-none cursor-grab bg-black active:cursor-grabbing"
    />
  );
}
