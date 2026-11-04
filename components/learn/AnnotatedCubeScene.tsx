import type { CSSProperties } from "react";
import CubeScene, { type CubeSceneProps } from "./CubeScene";
import type { CubeSceneLine } from "./cubeProps";
import { ANNOTATION_CLASS, DEFAULT_TURN_MS } from "../../utils/cubeSceneIsland";

export type CubeAnnotation = {
  text: string;
  x: number;
  y: number;
  moves: [first: number, last: number];
  duration?: number;
  anchor?: "top-left" | "bottom-left";
};

type AnnotatedCubeSceneProps = CubeSceneProps & {
  annotations: CubeAnnotation[];
};

type MovePlayTime = { startMs: number; endMs: number };

function movePlayTimes(lines: CubeSceneLine[]): MovePlayTime[] {
  const times: MovePlayTime[] = [];
  let clockMs = 0;
  for (const line of lines) {
    clockMs += line.delay ?? 0;
    line.moves.forEach((_, i) => {
      const startMs = clockMs;
      clockMs += line.durations?.[i] || DEFAULT_TURN_MS;
      times.push({ startMs, endMs: clockMs });
    });
  }
  return times;
}

function annotationTimingAttrs({ text, moves: [first, last], duration }: CubeAnnotation, times: MovePlayTime[]) {
  if (!times[first] || !times[last] || first > last) {
    throw new Error(`annotation "${text}" has move range [${first}, ${last}], but the scene has ${times.length} moves`);
  }
  const playMs = times[last].endMs - times[first].startMs;
  const shownMs = duration ?? playMs;
  return {
    "data-first-move": first,
    "data-last-move": last,
    "data-hold-ms": Math.max(0, shownMs - playMs),
    "data-cutoff-ms": shownMs < playMs ? shownMs : undefined,
  };
}

function annotationPosition({ x, y, anchor = "top-left" }: CubeAnnotation): CSSProperties {
  if (anchor === "top-left") return { left: `${x}%`, top: `${y}%` };
  return { left: `${x}%`, bottom: `${100 - y}%` };
}

export default function AnnotatedCubeScene({ annotations, ...scene }: AnnotatedCubeSceneProps) {
  const times = movePlayTimes(scene.lines ?? []);

  return (
    <CubeScene {...scene}>
      <div className="annotations">
        {annotations.map((annotation, i) => (
          <div
            key={i}
            className={ANNOTATION_CLASS}
            style={annotationPosition(annotation)}
            {...annotationTimingAttrs(annotation, times)}
          >
            {annotation.text}
          </div>
        ))}
      </div>
    </CubeScene>
  );
}
