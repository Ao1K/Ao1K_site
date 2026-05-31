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

export const ALL_PIECE_NAMES: string[] = [
  ...ORBIT_PIECE_NAMES.CORNERS,
  ...ORBIT_PIECE_NAMES.EDGES,
  ...ORBIT_PIECE_NAMES.CENTERS,
];

export const allHighlightSet = () => new Set(ALL_PIECE_NAMES);

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

interface FaceGridProps {
  face: string;
  faceColor: string;
  selected: Set<string>;
  onToggle: (piece: string) => void;
}

function FaceGrid({ face, faceColor, selected, onToggle }: FaceGridProps) {
  const layout = FACE_PIECES[face];
  return (
    <div className="grid grid-cols-[repeat(3,9px)] grid-rows-[repeat(3,9px)] gap-px">
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
              className="w-[9px] h-[9px] p-0 border-0 rounded-[1px] cursor-pointer -outline-offset-1"
              style={{
                backgroundColor: faceColor,
                opacity: isSelected ? 1 : 0.25,
                outline: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
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
  onSetSelection?: (next: Set<string>) => void;
  cubeColors: CubeColors;
}

export default function UnfoldedCube({ selected, onToggle, onSetSelection, cubeColors }: UnfoldedCubeProps) {
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

  // batch helpers: if no onSetSelection provided, fall back to calling onToggle
  // for each piece whose state needs to flip (so batch buttons still work).
  const applyNext = (next: Set<string>) => {
    if (onSetSelection) {
      onSetSelection(next);
      return;
    }
    ALL_PIECE_NAMES.forEach(piece => {
      const wasIn = selected.has(piece);
      const willBeIn = next.has(piece);
      if (wasIn !== willBeIn) onToggle(piece);
    });
  };

  const toggleOrbit = (pieces: string[]) => {
    const allSelected = pieces.every(p => selected.has(p));
    const next = new Set(selected);
    if (allSelected) pieces.forEach(p => next.delete(p));
    else pieces.forEach(p => next.add(p));
    applyNext(next);
  };

  const allLabel = selected.size === ALL_PIECE_NAMES.length ? 'None' : 'All';

  const orbitButtons: Array<{ label: string; onClick: () => void }> = [
    { label: allLabel, onClick: () => toggleOrbit(ALL_PIECE_NAMES) },
    { label: 'Centers', onClick: () => toggleOrbit(ORBIT_PIECE_NAMES.CENTERS) },
    { label: 'Corners', onClick: () => toggleOrbit(ORBIT_PIECE_NAMES.CORNERS) },
    { label: 'Edges', onClick: () => toggleOrbit(ORBIT_PIECE_NAMES.EDGES) },
  ];

  return (
    <div className="flex items-center gap-2 w-fit">
      <div className="grid grid-cols-2 gap-1 content-start">
        {orbitButtons.map(b => (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            className="rounded-sm border border-neutral-600 bg-dark/40 px-2 py-1 text-xs leading-tight text-neutral-200 hover:border-primary-100 hover:text-primary-100"
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(4,29px)] grid-rows-[repeat(3,29px)] gap-0.5 w-fit">
        {/* U — column 2, row 1 */}
        <div className="col-start-2 row-start-1">{makeFace('U')}</div>

        {/* middle row: L F R B */}
        <div className="col-start-1 row-start-2">{makeFace('L')}</div>
        <div className="col-start-2 row-start-2">{makeFace('F')}</div>
        <div className="col-start-3 row-start-2">{makeFace('R')}</div>
        <div className="col-start-4 row-start-2">{makeFace('B')}</div>

        {/* D — column 2, row 3 */}
        <div className="col-start-2 row-start-3">{makeFace('D')}</div>
      </div>
    </div>
  );
}
