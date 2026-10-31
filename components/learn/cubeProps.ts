import type { Color } from "../../composables/recon/SimpleCube";

type MoveLetter =
  | "U" | "D" | "R" | "L" | "F" | "B"
  | "M" | "E" | "S"
  | "u" | "d" | "r" | "l" | "f" | "b"
  | "x" | "y" | "z";

type MoveSuffix = "" | "'" | "2" | "2'" | "3" | "3'";

/** A single turn, e.g. `"R"`, `"U'"`, `"r2"`, `"x"`. Wide moves use lowercase (`"r"`), not `"Rw"`. */
export type CubeMove = `${MoveLetter}${MoveSuffix}`;

type SideEdgePair = "BO" | "BR" | "GO" | "GR";

/**
 * A piece named by its sticker colors: `W` or `Y` first, then the rest alphabetically.
 * Centers `"W"`, edges `"WG"`, `"GR"`, corners `"WGR"`.
 */
export type PieceName =
  | Color
  | `${"W" | "Y"}${"B" | "G" | "O" | "R"}`
  | SideEdgePair
  | `${"W" | "Y"}${SideEdgePair}`
  | "XX"
  | "XXX";

/** Hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) or `rgb()` / `rgba()`. Named colors are not supported. */
export type CubeColorValue = `#${string}` | `rgb(${string})` | `rgba(${string})`;

type StartFromScramble = {
  /** Moves applied to a solved cube, space separated. Invalid moves are skipped. */
  scramble?: string;
  facelets?: never;
};

type StartFromFacelets = {
  /**
   * 54 sticker colors in face order U D F R B L, each face read row by row as seen head-on.
   * U has B at top, D has F at top, side faces have U at top.
   * Letters `W Y R O G B`, or `X` for a gray blank sticker. Whitespace is ignored.
   */
  facelets?: string;
  scramble?: never;
};

export type CubeLookProps = (StartFromScramble | StartFromFacelets) & {
  /** View angle in degrees. `x` tilts vertically, `y` spins horizontally. Default `{ x: 30, y: 30 }`. */
  angles?: { x: number; y: number };
  /** Sticker color for each color letter. Must include all six. Defaults to the site cube colors. */
  colors?: Record<Color, CubeColorValue>;
  /** Color blended over dimmed pieces. Default `"#000000b3"`. */
  shade?: CubeColorValue;
  /** Opacity of dimmed pieces, 0 to 1. Default `0.6`. */
  dim?: number;
  /** Show hidden stickers floating outside the cube. Default `false`. */
  hints?: boolean;
  /** Show U/D/F/R/B/L letters beside each face. Default `false`. */
  labels?: boolean;
  /** Extra class added to the root element. */
  className?: string;
};

export type CubeSceneLine = {
  /** Turns played in order. An array entry turns its moves at the same time, e.g. `["R", "L'"]`. */
  moves: (CubeMove | CubeMove[])[];
  /** Duration in ms for each entry in `moves`, by index. Default 550. */
  durations?: number[];
  /** Wait in ms after this line's highlight is applied, before its first move. Default 0. */
  delay?: number;
  /** Pieces to keep bright during this line. All others dim. `null` or omitted clears dimming. */
  highlight?: PieceName[] | null;
};
