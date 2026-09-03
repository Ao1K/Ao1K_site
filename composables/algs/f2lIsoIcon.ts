import { SimpleCube, type Color, type CubeState } from '../recon/SimpleCube';
import { invertTokens, tokenize } from './algMoves';
import { algSolvedSlots, CORNERS, EDGES, type Facelet, type SlotKey } from './multislotSlots';
import { isEdgeOriented, HINT_MASK_COLOR, type FaceKey } from './cubePaint';
import { type ColorConfig, type IconDescriptor, type SvgShape } from '../recon/stepIconDescriptors';

const UP = 0;
const DOWN = 1;
const FRONT = 2;
const RIGHT = 3;
const BACK = 4;
const LEFT = 5;

const DEEMPHASIS = '#52525b';
const GROUT = '#161018';

const CHAR_FACE: Record<Color, keyof Pick<ColorConfig, 'up' | 'down' | 'front' | 'back' | 'right' | 'left'>> = {
  W: 'down', Y: 'up', G: 'right', R: 'front', B: 'left', O: 'back',
};

// the cube's real color identities, unlike CHAR_FACE above, which maps a color to the display
// face it is drawn as. EO has to be read in the cube's own frame, not the drawn one.
const FACE_KEY_AT: FaceKey[] = ['up', 'down', 'front', 'right', 'back', 'left'];

const CHAR_IDENTITY: Record<Color, FaceKey> = {
  W: 'up', Y: 'down', G: 'front', R: 'right', B: 'back', O: 'left',
};

function centerIdentities(state: CubeState): Record<FaceKey, FaceKey> {
  const orient = {} as Record<FaceKey, FaceKey>;
  FACE_KEY_AT.forEach((face, f) => { orient[face] = CHAR_IDENTITY[state[f][1][1]]; });
  return orient;
}

function edgeOriented(group: Facelet[], chars: Color[], orient: Record<FaceKey, FaceKey>): boolean {
  const faces = group.map(([f]) => FACE_KEY_AT[f]);
  const faceToId = new Map(faces.map((face, i) => [face, CHAR_IDENTITY[chars[i]]]));
  return isEdgeOriented(faces, faceToId, orient);
}

const SLOT_SIDE_CHARS: Record<SlotKey, [Color, Color]> = {
  FR: ['G', 'R'], BR: ['B', 'R'], BL: ['B', 'O'], FL: ['G', 'O'],
};

interface View {
  sides: [number, number];
  turns: number;
}

const VIEWS: Record<'FR' | 'FL' | 'BR' | 'BL', View> = {
  FR: { sides: [FRONT, RIGHT], turns: 0 },
  BR: { sides: [BACK, RIGHT], turns: 1 },
  BL: { sides: [BACK, LEFT], turns: 2 },
  FL: { sides: [FRONT, LEFT], turns: 3 },
};

const VIEW_ORDER: ('FR' | 'FL' | 'BR' | 'BL')[] = ['FR', 'FL', 'BR', 'BL'];

const U_STEP = 5;
const V_STEP = 2.8;
const H_STEP = 6;

const SIZE = 24;
const MARGIN = 0.5;

type Point3 = [number, number, number];
type Point2 = [number, number];

const STICKER_INSET = 0.12;

function insetQuad(pts: Point2[]): Point2[] {
  const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4;
  const cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
  return pts.map(([x, y]) => [x + (cx - x) * STICKER_INSET, y + (cy - y) * STICKER_INSET]);
}

function faceQuad(face: number, row: number, col: number): Point3[] {
  switch (face) {
    case UP:
      return [[col, 3, row], [col + 1, 3, row], [col + 1, 3, row + 1], [col, 3, row + 1]];
    case FRONT:
      return [[col, 2 - row, 3], [col + 1, 2 - row, 3], [col + 1, 3 - row, 3], [col, 3 - row, 3]];
    case RIGHT:
      return [[3, 2 - row, 2 - col], [3, 2 - row, 3 - col], [3, 3 - row, 3 - col], [3, 3 - row, 2 - col]];
    case BACK:
      return [[2 - col, 2 - row, 0], [3 - col, 2 - row, 0], [3 - col, 3 - row, 0], [2 - col, 3 - row, 0]];
    default:
      return [[0, 2 - row, col], [0, 2 - row, col + 1], [0, 3 - row, col + 1], [0, 3 - row, col]];
  }
}

function project([x, y, z]: Point3, view: View): [number, number] {
  let xp = x;
  let zp = z;
  for (let i = 0; i < view.turns; i++) [xp, zp] = [3 - zp, xp];
  return [(xp - zp) * U_STEP, (xp + zp) * V_STEP - y * H_STEP];
}

export function f2lIsoDescriptor(alg: string, config: ColorConfig, eoColor?: string): IconDescriptor {
  const state = new SimpleCube().getCubeState(invertTokens(tokenize(alg)));
  const realOf = (c: Color): string => config[CHAR_FACE[c]];
  const key = (f: number, r: number, c: number): string => `${f},${r},${c}`;

  const slots = algSolvedSlots(alg);
  const cross = state[DOWN][1][1];
  const targetCornerKeys = new Set<string>();
  const targetEdgeKeys = new Set<string>();
  for (const slot of slots) {
    const [a, b] = SLOT_SIDE_CHARS[slot];
    targetEdgeKeys.add([a, b].sort().join(''));
    targetCornerKeys.add([cross, a, b].sort().join(''));
  }

  const isZbls = eoColor != null;
  const otherSlotCornerKeys = new Set<string>();
  const otherSlotEdgeKeys = new Set<string>();
  if (isZbls) {
    for (const slot of Object.keys(SLOT_SIDE_CHARS) as SlotKey[]) {
      if (slots.includes(slot)) continue;
      const [a, b] = SLOT_SIDE_CHARS[slot];
      otherSlotEdgeKeys.add([a, b].sort().join(''));
      otherSlotCornerKeys.add([cross, a, b].sort().join(''));
    }
  }

  const isSolvedInCase = (group: Facelet[], chars: Color[]): boolean =>
    group.every(([f], i) => chars[i] === state[f][1][1]);

  const paint = new Map<string, string>();
  const targetFacelets = new Set<string>();

  for (const f of [UP, DOWN, FRONT, RIGHT, BACK, LEFT]) {
    paint.set(key(f, 1, 1), realOf(state[f][1][1]));
  }

  for (const group of CORNERS) {
    const chars = group.map(([f, r, c]) => state[f][r][c]);
    const identity = [...chars].sort().join('');
    const relevant = targetCornerKeys.has(identity);
    const shown = relevant || (otherSlotCornerKeys.has(identity) && isSolvedInCase(group, chars));
    group.forEach(([f, r, c], i) => {
      paint.set(key(f, r, c), shown ? realOf(chars[i]) : DEEMPHASIS);
      if (relevant) targetFacelets.add(key(f, r, c));
    });
  }

  const orient = centerIdentities(state);

  for (const group of EDGES) {
    const chars = group.map(([f, r, c]) => state[f][r][c]);
    const identity = [...chars].sort().join('');
    const relevant = targetEdgeKeys.has(identity);
    const isCross = chars.includes(cross);
    const shown = relevant || isCross || (otherSlotEdgeKeys.has(identity) && isSolvedInCase(group, chars));
    const eoFill = isZbls && !shown
      ? (edgeOriented(group, chars, orient) ? eoColor : HINT_MASK_COLOR)
      : null;
    group.forEach(([f, r, c], i) => {
      paint.set(key(f, r, c), eoFill ?? (shown ? realOf(chars[i]) : DEEMPHASIS));
      if (relevant) targetFacelets.add(key(f, r, c));
    });
  }

  const visibleTargetCount = (view: View): number => {
    let n = 0;
    for (const f of [UP, ...view.sides]) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (targetFacelets.has(key(f, r, c))) n++;
        }
      }
    }
    return n;
  };

  let best = VIEWS[VIEW_ORDER[0]];
  let bestCount = -1;
  for (const name of VIEW_ORDER) {
    const count = visibleTargetCount(VIEWS[name]);
    if (count > bestCount) {
      bestCount = count;
      best = VIEWS[name];
    }
  }

  const cells: { pts: Point2[]; fill: string }[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (const f of [best.sides[0], best.sides[1], UP]) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const projected = faceQuad(f, r, c).map((p) => project(p, best)) as Point2[];
        projected.forEach(([x, y]) => { xs.push(x); ys.push(y); });
        cells.push({ pts: projected, fill: paint.get(key(f, r, c)) ?? DEEMPHASIS });
      }
    }
  }

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const rawW = Math.max(...xs) - minX;
  const rawH = Math.max(...ys) - minY;
  const scale = (SIZE - 2 * MARGIN) / Math.max(rawW, rawH);
  const offX = MARGIN + (SIZE - 2 * MARGIN - rawW * scale) / 2 - minX * scale;
  const offY = MARGIN + (SIZE - 2 * MARGIN - rawH * scale) / 2 - minY * scale;
  const place = (pts: Point2[]): string =>
    pts.map(([x, y]) => `${(x * scale + offX).toFixed(2)},${(y * scale + offY).toFixed(2)}`).join(' ');

  const body: SvgShape[] = cells.map((cell): SvgShape => ({ type: 'polygon', points: place(cell.pts), fill: GROUT }));
  const stickers: SvgShape[] = cells.map((cell): SvgShape => ({ type: 'polygon', points: place(insetQuad(cell.pts)), fill: cell.fill }));

  return { viewBox: `0 0 ${SIZE} ${SIZE}`, shapes: [...body, ...stickers], transparentBg: true, strokeWidth: 0, enlarge: true };
}
