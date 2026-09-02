import * as fs from 'fs';
import * as path from 'path';
import { SimpleCube } from '../composables/recon/SimpleCube';
import { CUBE_SCENE_CSS } from '../utils/cubeSceneCss';
import { faceletsFromState } from '../utils/cubeMoves';
import { islandFrameZero, type SceneIsland } from '../utils/cubeSceneIsland';
import { cubieWorld } from '../utils/cubeSceneRuntime.client';
import {
  buildCubeSvgBody,
  cubeLooks,
  cubiePlacement,
  cubiesFromState,
  renderSceneMarkup,
  sceneGeometry,
} from '../utils/cubeSvgRender';

const COLORS = { W: '#ffffff', Y: '#ffd500', G: '#009b48', R: '#b71234', B: '#0046ad', O: '#ff5800' };

const SCRAMBLES = [
  '',
  "R U R' U'",
  "D2 F' L2 B U R2 F' D B2 R U'",
  "M2 E2 S2 x y' z2",
];

const ANGLES = [
  { x: -30, y: 0 },
  { x: -30, y: -30 },
  { x: -30, y: 30 },
  { x: -22.5, y: -37.5 },
];

const HIGHLIGHTS: Array<string[] | null> = [
  null,
  ['WG', 'WR', 'WB', 'WO', 'WGO', 'WGR'],
  [],
];

function faceletsFor(scramble: string): string {
  const moves = scramble.trim().split(/\s+/).filter(Boolean);
  return faceletsFromState(new SimpleCube().getCubeState(moves));
}

// what the runtime paints on its first frame, reached through the same helpers createScene uses
function runtimeFirstFrame(island: SceneIsland): string {
  const geometry = sceneGeometry(island.angles);
  const looks = cubeLooks(island.colors, island.shade, island.dim);
  const rest = islandFrameZero(island);
  const highlightSet = rest.highlight ? new Set(rest.highlight) : null;

  return renderSceneMarkup({
    geometry,
    looks,
    showFacelets: island.hints,
    showFaceLabels: island.labels,
    cubies: cubiesFromState(rest.state).map(c => {
      const place = cubiePlacement(c.x, c.y, c.z);
      return {
        stickers: c.stickers,
        world: cubieWorld(geometry, { mat: place, live: null }),
        dim: highlightSet !== null && !highlightSet.has(c.piece) ? 1 : 0,
      };
    }),
  });
}

function checkStylesheet(): string | null {
  const globals = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');
  return globals.includes(CUBE_SCENE_CSS)
    ? null
    : 'app/globals.css no longer contains the block in utils/cubeSceneCss.ts';
}

function main() {
  let checked = 0;
  const failures: string[] = [];

  const cssProblem = checkStylesheet();
  if (cssProblem) failures.push(cssProblem);

  for (const scramble of SCRAMBLES) {
    const facelets = faceletsFor(scramble);
    for (const angles of ANGLES) {
      for (const highlight of HIGHLIGHTS) {
        for (const hints of [false, true]) {
          for (const labels of [false, true]) {
            for (const startHighlighted of [false, true]) {
              const island: SceneIsland = {
                facelets,
                angles,
                colors: COLORS,
                shade: '#000000b3',
                dim: 0.35,
                hints,
                labels,
                lines: [{ moves: [], durations: [], delay: 0, highlight }],
                loop: false,
                progress: false,
                startHighlighted,
              };
              const server = buildCubeSvgBody(islandFrameZero(island));
              const client = runtimeFirstFrame(island);
              checked++;
              if (server !== client) {
                failures.push(
                  `scramble="${scramble}" angles=${JSON.stringify(angles)} hints=${hints} ` +
                  `labels=${labels} startHighlighted=${startHighlighted} highlight=${JSON.stringify(highlight)}`
                );
              }
            }
          }
        }
      }
    }
  }

  if (failures.length) {
    console.error(`FAIL ${failures.length}/${checked} frame-zero mismatches:`);
    failures.forEach(f => console.error('  ' + f));
    process.exit(1);
  }
  console.log(`OK ${checked} frame-zero comparisons matched`);
}

main();
