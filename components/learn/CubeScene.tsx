import { buildSceneIsland, type AuthoredScene } from "../../utils/cubeSceneAuthoring";
import { islandFrameZero, SCENE_DATA_ATTR, CUBE_SVG_CLASS } from "../../utils/cubeSceneIsland";
import { buildCubeSvgBody, SCENE_PX } from "../../utils/cubeSvgRender";

const PLAY_PATH =
  "M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z";

function embeddableJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export type CubeSceneProps = AuthoredScene & { className?: string };

export default function CubeScene({ className, ...scene }: CubeSceneProps) {
  const island = buildSceneIsland(scene);
  const frameZero = buildCubeSvgBody(islandFrameZero(island));
  const interactive = island.lines.some((line) => line.moves.length > 0);
  const sceneAttr = { [SCENE_DATA_ATTR]: "" };

  return (
    <div {...sceneAttr} className={`cube-scene${className ? ` ${className}` : ""}`}>
      <svg
        className={CUBE_SVG_CLASS}
        viewBox={`0 0 ${SCENE_PX} ${SCENE_PX}`}
        dangerouslySetInnerHTML={{ __html: frameZero }}
      />
      {interactive && (
        <div className="overlay" style={{ background: "rgba(0,0,0,0.45)" }}>
          <svg className="icon-play" viewBox="0 0 256 256" style={{ opacity: 0.85 }}>
            <path d={PLAY_PATH} />
          </svg>
        </div>
      )}
      {island.progress && (
        <div className="progress">
          <div className="progress-fill" />
        </div>
      )}
      {interactive && (
        <script
          type="application/json"
          dangerouslySetInnerHTML={{ __html: embeddableJson(island) }}
        />
      )}
    </div>
  );
}
