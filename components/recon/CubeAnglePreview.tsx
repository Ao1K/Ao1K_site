'use client';
import { useEffect, useRef } from 'react';
import { createOrbit, type Angles, type Orbit } from '../../utils/cubeSceneRuntime.client';
import { CUBE_SVG_CLASS } from '../../utils/cubeSceneIsland';
import { buildColorHex } from '../../utils/cubeSceneAuthoring';
import { buildCubeSvgBody, SCENE_PX } from '../../utils/cubeSvgRender';
import { stateFromFacelets } from '../../utils/cubeMoves';
import type { CubeColors } from '../../composables/useSettings';

interface CubeAnglePreviewProps {
  facelets: string;
  angles: Angles;
  onAnglesChange: (angles: Angles) => void;
  cubeColors: CubeColors;
  shade: string;
  dim: number;
  hints: boolean;
  labels: boolean;
  highlight: string[] | null;
}

const roundAngle = (deg: number) => Math.round(deg * 100) / 100;

export default function CubeAnglePreview({
  facelets,
  angles,
  onAnglesChange,
  cubeColors,
  shade,
  dim,
  hints,
  labels,
  highlight,
}: CubeAnglePreviewProps) {
  const orbitAreaRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<Orbit | null>(null);

  useEffect(() => {
    const orbitArea = orbitAreaRef.current;
    if (!orbitArea) return;

    const orbit = createOrbit(orbitArea, { x: 0, y: 0 }, 0, () => {
      orbit.step();
      const dragged = orbit.angles();
      onAnglesChange({ x: roundAngle(dragged.x), y: roundAngle(dragged.y) });
    });
    orbitRef.current = orbit;

    return () => {
      orbit.destroy();
      orbitRef.current = null;
    };
  }, [onAnglesChange]);

  const markup = buildCubeSvgBody({
    state: stateFromFacelets(facelets),
    angles,
    colorHex: buildColorHex(cubeColors),
    showFacelets: hints,
    showFaceLabels: labels,
    shadeColor: shade,
    dimOpacity: dim,
    highlight,
  });

  return (
    <div
      ref={orbitAreaRef}
      className="absolute inset-0 touch-none"
      onPointerDownCapture={() => orbitRef.current?.setAngles(angles)}
    >
      <svg
        className={`${CUBE_SVG_CLASS} block h-full w-full`}
        viewBox={`0 0 ${SCENE_PX} ${SCENE_PX}`}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </div>
  );
}
