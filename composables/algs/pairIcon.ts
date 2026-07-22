// Builds the F2L pair icon descriptor for a saved alg. Shared by the on-page card
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

function rotateDirections(dirs: F2LDirection[], turns: number): F2LDirection[] {
  const n = ((turns % 4) + 4) % 4;
  let result = dirs;
  for (let i = 0; i < n; i++) result = result.map((dir) => Y_TURN_NEXT[dir]);
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

export type SlotKey = 'FL' | 'FR' | 'BL' | 'BR';

const SLOT_DIRECTIONS: Record<SlotKey, F2LDirection[]> = {
  FL: ['front', 'left'],
  FR: ['front', 'right'],
  BL: ['back', 'left'],
  BR: ['back', 'right'],
};

const DIRECTION_COLOR: Record<F2LDirection, string> = {
  front: 'green', right: 'red', back: 'blue', left: 'orange',
};

function paintDirections(dirs: F2LDirection[]): Partial<Record<F2LDirection, string>> {
  return Object.fromEntries(dirs.map((dir) => [dir, DIRECTION_COLOR[dir]]));
}

// the slot the alg solves into, in its final viewing frame. Running the inverse on a solved
// cube lifts the solved pair into the top layer, leaving exactly one bottom slot disturbed
// (its down sticker no longer yellow); rotating that slot by the alg's own net turns lands it
// where the alg actually solves the pair, matching f2lAlgCard. Falls back to the front-right slot.
function solvedSlotDirections(alg: string): F2LDirection[] {
  const down = new SimpleCube().getCubeState(tokenize(invertAlg(alg)))[1];
  const corners: Record<SlotKey, string> = { FL: down[0][0], FR: down[0][2], BL: down[2][0], BR: down[2][2] };
  const disturbed = (Object.keys(corners) as SlotKey[]).find((slot) => corners[slot] !== 'Y');
  return rotateDirections(SLOT_DIRECTIONS[disturbed ?? 'FR'], netAlgYTurns(alg));
}

function slotDescriptor(slots: F2LDirection[][], config: ColorConfig): IconDescriptor {
  const stepInfo: StepInfo = {
    step: slots.length > 1 ? 'multislot' : 'pair',
    type: 'f2l',
    colors: [],
    f2lSlotList: slots.map(paintDirections),
  };
  return getStepIconDescriptor(config, stepInfo);
}

// an F2L pair icon pointing at the slot the alg rotates toward, colored by the two faces
// that slot sits between. Built from the same descriptor pipeline as the f2lAlgCard icon.
export function pairDescriptor(alg: string, config: ColorConfig): IconDescriptor {
  return slotDescriptor([solvedSlotDirections(alg)], config);
}

export function slotsDescriptor(slots: SlotKey[], config: ColorConfig): IconDescriptor {
  return slotDescriptor(slots.map((slot) => SLOT_DIRECTIONS[slot]), config);
}
