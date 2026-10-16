import { DEFAULT_SCENE_LOOK } from "../../utils/cubeSceneAuthoring";
import { stateFromFacelets } from "../../utils/cubeMoves";
import { SimpleCube } from "../../composables/recon/SimpleCube";
import { buildCubeSvgBody, SCENE_PX, type CubeSvgOptions } from "../../utils/cubeSvgRender";
import type { CubeLookProps, PieceName } from "./cubeProps";

export type CubeImageProps = CubeLookProps & {
  /** Pieces to keep bright. All others dim. `null` or omitted shows every piece bright. */
  highlight?: PieceName[] | null;
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
