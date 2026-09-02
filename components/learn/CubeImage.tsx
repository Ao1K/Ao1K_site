import { DEFAULT_SCENE_LOOK } from "../../utils/cubeSceneAuthoring";
import { stateFromFacelets } from "../../utils/cubeMoves";
import { SimpleCube } from "../../composables/recon/SimpleCube";
import { buildCubeSvgBody, SCENE_PX, type CubeSvgOptions } from "../../utils/cubeSvgRender";
import type { Color } from "../../composables/recon/SimpleCube";

export type CubeImageProps = {
  scramble?: string;
  facelets?: string;
  angles?: { x: number; y: number };
  colors?: Record<Color, string>;
  shade?: string;
  dim?: number;
  hints?: boolean;
  labels?: boolean;
  highlight?: string[] | null;
  className?: string;
};

export default function CubeImage({ className, ...image }: CubeImageProps) {
  const opts: CubeSvgOptions = {
    state: image.facelets
      ? stateFromFacelets(image.facelets)
      : new SimpleCube().getCubeState((image.scramble ?? "").trim().split(/\s+/).filter(Boolean)),
    angles: image.angles ?? DEFAULT_SCENE_LOOK.angles,
    colorHex: image.colors ?? DEFAULT_SCENE_LOOK.colors,
    showFacelets: image.hints ?? false,
    showFaceLabels: image.labels ?? false,
    shadeColor: image.shade ?? DEFAULT_SCENE_LOOK.shade,
    dimOpacity: image.dim ?? DEFAULT_SCENE_LOOK.dim,
    highlight: image.highlight ?? null,
  };

  return (
    <svg
      className={`cube-svg${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${SCENE_PX} ${SCENE_PX}`}
      dangerouslySetInnerHTML={{ __html: buildCubeSvgBody(opts) }}
    />
  );
}
