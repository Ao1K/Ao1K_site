import type { ReactNode } from "react";
import { buildSceneIsland } from "../../utils/cubeSceneAuthoring";
import type { CubeLookProps, CubeSceneLine } from "./cubeProps";
import {
  islandFrameZero,
  SCENE_DATA_ATTR,
  CUBE_SVG_CLASS,
  PLAY_ICON_PATH,
  REPLAY_ICON_PATH,
} from "../../utils/cubeSceneIsland";
import { buildCubeSvgBody, SCENE_PX } from "../../utils/cubeSvgRender";

function embeddableJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export type CubeSceneProps = CubeLookProps & {
  /** Animation steps played in order. Click the scene to play or pause. No moves means a still image. */
  lines?: CubeSceneLine[];
  /** Restart after a 1s pause at the end. Otherwise it stops and shows the replay button. Default `false`. */
  loop?: boolean;
  /** Show a progress bar under the cube. Default `false`. */
  progress?: boolean;
  /** Apply the first line's highlight before playback starts. Default `false`. */
  startHighlighted?: boolean;
  /** Drag the cube to rotate the view. Default `false`. */
  orbit?: boolean;
  autoplay?: boolean;
  children?: ReactNode;
};

export default function CubeScene({ className, children, ...scene }: CubeSceneProps) {
  const island = buildSceneIsland(scene);
  const frameZero = buildCubeSvgBody(islandFrameZero(island));
  const hasMoves = island.lines.some((line) => line.moves.length > 0);
  const sceneAttr = { [SCENE_DATA_ATTR]: "" };

  return (
    <div
      {...sceneAttr}
      className={`cube-scene${island.orbit ? " orbit" : ""}${className ? ` ${className}` : ""}`}
    >
      <svg
        className={CUBE_SVG_CLASS}
        viewBox={`0 0 ${SCENE_PX} ${SCENE_PX}`}
        dangerouslySetInnerHTML={{ __html: frameZero }}
      />
      {hasMoves && (
        <div className="overlay" style={{ background: island.autoplay ? "transparent" : "rgba(0,0,0,0.45)" }}>
          <svg className="icon-play" viewBox="0 0 256 256" style={{ opacity: island.autoplay ? 0 : 0.85 }}>
            <path d={PLAY_ICON_PATH} />
          </svg>
          <svg className="icon-replay" viewBox="0 0 256 256" style={{ opacity: 0 }}>
            <path d={REPLAY_ICON_PATH} />
          </svg>
        </div>
      )}
      {children}
      {island.progress && (
        <div className="progress">
          <div className="progress-fill" />
        </div>
      )}
      {(hasMoves || island.orbit) && (
        <script
          type="application/json"
          dangerouslySetInnerHTML={{ __html: embeddableJson(island) }}
        />
      )}
    </div>
  );
}
