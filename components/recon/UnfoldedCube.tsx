import type { CubeColors } from '../../composables/useSettings';

// piece color-name arrays in cubing.js orbit order — used for stickering mask construction.
// color letters: W=white(U), O=orange(L), G=green(F), R=red(R), B=blue(B), Y=yellow(D).
// canonical form: W or Y (U/D face) comes first, remaining letters sorted alphabetically.
export const ORBIT_PIECE_NAMES: Record<string, string[]> = {
  CORNERS: ['WGR', 'WBR', 'WBO', 'WGO', 'YGR', 'YGO', 'YBO', 'YBR'],
  EDGES:   ['WG', 'WR', 'WB', 'WO', 'YG', 'YR', 'YB', 'YO', 'GR', 'GO', 'BR', 'BO'],
  CENTERS: ['W', 'O', 'G', 'R', 'B', 'Y'],
};

export const CENTER_PIECES = new Set(ORBIT_PIECE_NAMES.CENTERS);

export const defaultHighlightSet = () => new Set(ORBIT_PIECE_NAMES.CENTERS);

// sticker layout per face: [row][col] = color-based piece name
// faces are viewed from the outside of the cube with U at top (except U/D which use F direction as reference)
const FACE_PIECES: Record<string, string[][]> = {
  U: [
    ['WBO', 'WB',  'WBR'],
    ['WO',  'W',   'WR' ],
    ['WGO', 'WG',  'WGR'],
  ],
  L: [
    ['WBO', 'WO',  'WGO'],
    ['BO',  'O',   'GO' ],
    ['YBO', 'YO',  'YGO'],
  ],
  F: [
    ['WGO', 'WG',  'WGR'],
    ['GO',  'G',   'GR' ],
    ['YGO', 'YG',  'YGR'],
  ],
  R: [
    ['WGR', 'WR',  'WBR'],
    ['GR',  'R',   'BR' ],
    ['YGR', 'YR',  'YBR'],
  ],
  B: [
    ['WBR', 'WB',  'WBO'],
    ['BR',  'B',   'BO' ],
    ['YBR', 'YB',  'YBO'],
  ],
  D: [
    ['YGO', 'YG',  'YGR'],
    ['YO',  'Y',   'YR' ],
    ['YBO', 'YB',  'YBR'],
  ],
};

const CELL_SIZE = 9;
const CELL_GAP  = 1;
const FACE_SIZE = CELL_SIZE * 3 + CELL_GAP * 2; // 29px
const FACE_GAP  = 2;

interface FaceGridProps {
  face: string;
  faceColor: string;
  selected: Set<string>;
  onToggle: (piece: string) => void;
}

function FaceGrid({ face, faceColor, selected, onToggle }: FaceGridProps) {
  const layout = FACE_PIECES[face];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(3, ${CELL_SIZE}px)`,
        gap: `${CELL_GAP}px`,
      }}
    >
      {layout.map((row, r) =>
        row.map((piece, c) => {
          const isSelected = selected.has(piece);
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${piece}`}
              aria-pressed={isSelected}
              onClick={() => onToggle(piece)}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: faceColor,
                opacity: isSelected ? 1 : 0.25,
                outline: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                outlineOffset: '-1px',
                border: 'none',
                borderRadius: 1,
                cursor: 'pointer',
                padding: 0,
              }}
            />
          );
        })
      )}
    </div>
  );
}

interface UnfoldedCubeProps {
  selected: Set<string>;
  onToggle: (piece: string) => void;
  cubeColors: CubeColors;
}

export default function UnfoldedCube({ selected, onToggle, cubeColors }: UnfoldedCubeProps) {
  const faceColors: Record<string, string> = {
    U: cubeColors.up,
    L: cubeColors.left,
    F: cubeColors.front,
    R: cubeColors.right,
    B: cubeColors.back,
    D: cubeColors.down,
  };

  const makeFace = (face: string) => (
    <FaceGrid
      face={face}
      faceColor={faceColors[face]}
      selected={selected}
      onToggle={onToggle}
    />
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(4, ${FACE_SIZE}px)`,
        gridTemplateRows: `repeat(3, ${FACE_SIZE}px)`,
        gap: `${FACE_GAP}px`,
        width: 'fit-content',
      }}
    >
      {/* U — column 2, row 1 */}
      <div style={{ gridColumn: 2, gridRow: 1 }}>{makeFace('U')}</div>

      {/* middle row: L F R B */}
      <div style={{ gridColumn: 1, gridRow: 2 }}>{makeFace('L')}</div>
      <div style={{ gridColumn: 2, gridRow: 2 }}>{makeFace('F')}</div>
      <div style={{ gridColumn: 3, gridRow: 2 }}>{makeFace('R')}</div>
      <div style={{ gridColumn: 4, gridRow: 2 }}>{makeFace('B')}</div>

      {/* D — column 2, row 3 */}
      <div style={{ gridColumn: 2, gridRow: 3 }}>{makeFace('D')}</div>
    </div>
  );
}
