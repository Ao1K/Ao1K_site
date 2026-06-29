// Builds the greyscale F2L pair icon descriptor for a saved alg. Shared by the on-page card
// (YourAlgCard) and the PDF export so both render the same icon. The icon points toward the
// slot the alg rotates the cube toward; see solvedSlotDirections for how that slot is found.

import { SimpleCube } from '../recon/SimpleCube';
import { tokenize } from './algMoves';
import { type StepInfo, type F2LDirection } from '../recon/SimpleCubeInterpreter';
import {
  getStepIconDescriptor,
  type ColorConfig,
  type IconDescriptor,
} from '../recon/stepIconDescriptors';

// where each facing direction lands after one +y turn (clockwise from above)
const Y_TURN_NEXT: Record<F2LDirection, F2LDirection> = {
  front: 'left', left: 'back', back: 'right', right: 'front',
};

function rotateDirections(
  dirs: Partial<Record<F2LDirection, string>>,
  turns: number,
): Partial<Record<F2LDirection, string>> {
  const n = ((turns % 4) + 4) % 4;
  let result = dirs;
  for (let i = 0; i < n; i++) {
    const next: Partial<Record<F2LDirection, string>> = {};
    for (const [dir, color] of Object.entries(result) as [F2LDirection, string][]) {
      next[Y_TURN_NEXT[dir]] = color;
    }
    result = next;
  }
  return result;
}

// net quarter y-turns the alg imparts to the cube frame, read from the front center after
// running the alg on a solved cube. Assumes the cross stays on the bottom.
const FRONT_CENTER_TURNS: Record<string, number> = { G: 0, R: 1, B: 2, O: 3 };
function netAlgYTurns(alg: string): number {
  const state = new SimpleCube().getCubeState(tokenize(alg));
  return FRONT_CENTER_TURNS[state[2][1][1]] ?? 0;
}

// the alg's inverse, used to recover the F2L case it solves
function invertAlg(alg: string): string {
  return tokenize(alg)
    .reverse()
    .map((m) =>
      m.endsWith('2') ? m
        : m.endsWith("2'") ? m.slice(0, -1)
          : m.endsWith("'") ? m.slice(0, -1)
            : m + "'",
    )
    .join(' ');
}

// the placeholder slot facings for each bottom slot (real colors don't matter for a greyscale icon)
const SLOT_DIRECTIONS: Record<string, Partial<Record<F2LDirection, string>>> = {
  FL: { front: 'gray', left: 'gray' },
  FR: { front: 'gray', right: 'gray' },
  BL: { back: 'gray', left: 'gray' },
  BR: { back: 'gray', right: 'gray' },
};

// the slot the alg solves into, in its final viewing frame. Running the inverse on a solved
// cube lifts the solved pair into the top layer, leaving exactly one bottom slot disturbed
// (its down sticker no longer yellow); rotating that slot by the alg's own net turns lands it
// where the alg actually solves the pair, matching f2lAlgCard. Falls back to the front-right slot.
function solvedSlotDirections(alg: string): Partial<Record<F2LDirection, string>> {
  const down = new SimpleCube().getCubeState(tokenize(invertAlg(alg)))[1];
  const corners: Record<string, string> = { FL: down[0][0], FR: down[0][2], BL: down[2][0], BR: down[2][2] };
  const disturbed = Object.keys(corners).find((slot) => corners[slot] !== 'Y');
  return rotateDirections(SLOT_DIRECTIONS[disturbed ?? 'FR'], netAlgYTurns(alg));
}

// the pair builder picks slot colors from the config by direction; with all faces empty here
// both triangles resolve to gray, which we then override with two shades below
const GREY_CONFIG: ColorConfig = {
  up: '', down: '', front: '', back: '', right: '', left: '',
  gray: '#71717a', darkBg: '#161018',
};
export const PAIR_ICON_BG = GREY_CONFIG.darkBg;
export const PAIR_LIGHT = '#d4d4d8';
export const PAIR_DARK = '#71717a';

// a generic, greyscale F2L pair icon pointing at the slot the alg rotates toward. Built from
// the same descriptor pipeline as the colored f2lAlgCard icon, then recolored to two greys.
export function greyscalePairDescriptor(alg: string): IconDescriptor {
  const slot = solvedSlotDirections(alg);
  const stepInfo: StepInfo = { step: 'pair', type: 'f2l', colors: [], f2lSlotList: [slot] };
  const descriptor = getStepIconDescriptor(GREY_CONFIG, stepInfo);
  let polygonIndex = 0;
  const shapes = descriptor.shapes.map((shape) => {
    // the two triangles become two shades of grey; the knockout rect keeps its dark fill
    if (shape.type !== 'polygon') return shape;
    return { ...shape, fill: polygonIndex++ === 0 ? PAIR_LIGHT : PAIR_DARK };
  });
  return { ...descriptor, shapes };
}
