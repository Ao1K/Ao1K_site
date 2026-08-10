'use client';

// A single F2L suggestion: pair icon, the alg, copy / favorite / play controls, and an
// optional step-by-step breakdown dropdown. Styled after recon's SuggestionCard.

import { Fragment, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { type StepInfo, type F2LDirection } from '../../composables/recon/SimpleCubeInterpreter';
import { ORIENTATIONS, FACE_COLOR_NAME, type FaceKey } from '../../composables/algs/cubePaint';
import { SimpleCube, type CubeState, type Color } from '../../composables/recon/SimpleCube';
import { tokenize } from '../../composables/algs/algMoves';
import {
  getStepIconDescriptor,
  type ColorConfig,
  type IconDescriptor,
  type SvgShape,
} from '../../composables/recon/stepIconDescriptors';
import {
  labelF2lAlg,
  UNINFORMATIVE_LABELS,
  type F2lGroupName,
  type F2lSegment,
} from '../../composables/algs/f2lLabeling';
import PlayIcon from '../icons/play';
import StopIcon from '../icons/stop';
import CopyIcon from '../icons/copy';
import DropdownIcon from '../icons/dropdown';
import Parrot from '../icons/parrot';

interface F2lAlgCardProps {
  alg: string;
  // the interpreter's step labels for this suggestion (used to draw the pair icon)
  steps: string[];
  cross: FaceKey;
  // the case position the alg starts from, used to trace the solution's breakpoints
  caseState: CubeState | null;
  pairColors: [Color, Color];
  // net quarter turns of the preview about the vertical axis
  yTurns: number;
  colorConfig: ColorConfig;
  isPlaying: boolean;
  // index of the alg move to highlight while it animates, or -1 for none
  highlightedMove: number;
  isFavorited: boolean;
  // the card picks the form to animate: the alg, or the breakdown's split-up moves when open
  onPlay: (playbackAlg: string) => void;
  onToggleFavorite: () => void;
}

// a pair label's initials back to color identities
const FACE_OF_INITIAL: Record<string, FaceKey> = {
  W: 'up', Y: 'down', G: 'front', B: 'back', R: 'right', O: 'left',
};

function renderShape(shape: SvgShape, i: number) {
  if (shape.type === 'rect')
    return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} />;
  if (shape.type === 'polygon') return <polygon key={i} points={shape.points} fill={shape.fill} />;
  return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
}

function PairIcon({ descriptor, title }: { descriptor: IconDescriptor; title: string }) {
  return (
    <svg
      viewBox={descriptor.viewBox}
      className="h-7 w-7 shrink-0 border border-neutral-600"
      stroke="#52525b"
      strokeWidth="1"
      fill="none"
    >
      {descriptor.shapes.map(renderShape)}
      <title>{title}</title>
    </svg>
  );
}

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

// net quarter y-turns the alg imparts to the cube frame. Found by running the alg on a
// solved cube and reading the front center, so wide/slice moves that rotate the frame
// without a literal y (e.g. wide D) are caught. Assumes the cross stays on the bottom.
const FRONT_CENTER_TURNS: Record<string, number> = { G: 0, R: 1, B: 2, O: 3 };
function netAlgYTurns(alg: string): number {
  const state = new SimpleCube().getCubeState(tokenize(alg));
  return FRONT_CENTER_TURNS[state[2][1][1]] ?? 0;
}

// builds the positioned F2L pair icon for a "GR pair"-style label, rotating the slot by the
// view angle plus the alg's own rotation so it lands where the alg actually solves the pair.
function pairDescriptor(label: string, cross: FaceKey, turns: number, colors: ColorConfig): IconDescriptor | null {
  const match = /^([WYGBRO])([WYGBRO]) pair$/.exec(label);
  if (!match) return null;
  const orient = ORIENTATIONS[cross];
  const faces = Object.keys(orient) as FaceKey[];
  const f2lDirections: Partial<Record<F2LDirection, string>> = {};
  for (const initial of [match[1], match[2]]) {
    const ident = FACE_OF_INITIAL[initial];
    const dir = faces.find((f) => orient[f] === ident);
    if (dir !== 'front' && dir !== 'back' && dir !== 'left' && dir !== 'right') return null;
    f2lDirections[dir] = FACE_COLOR_NAME[ident].toLowerCase();
  }
  const stepInfo: StepInfo = { step: 'pair', type: 'f2l', colors: [], f2lSlotList: [rotateDirections(f2lDirections, turns)] };
  return getStepIconDescriptor(colors, stepInfo);
}

// moves focus to the previous / next card via arrow keys
function focusSiblingCard(current: HTMLElement, direction: 1 | -1) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-f2l-card]'));
  const index = cards.indexOf(current);
  cards[index + direction]?.focus();
}

// terms that link to their lesson wherever they appear in a segment label or group name
const TERM_LESSONS: Record<string, string> = {
  EO: '/learn/eo',
  Keyhole: '/learn/keyhole',
  Commutator: 'https://www.speedsolving.com/wiki/index.php/Commutators_and_Conjugates',
  Conjugate: 'https://www.speedsolving.com/wiki/index.php/Commutators_and_Conjugates',
};

const TERM_PATTERN = new RegExp(`\\b(${Object.keys(TERM_LESSONS).join('|')})\\b`);

function renderTerms(text: string) {
  const parts = text.split(TERM_PATTERN);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Link
            key={i}
            href={TERM_LESSONS[part]}
            target="_blank"
            rel='noopener noreferrer'
            className="text-primary-200 underline underline-offset-2 hover:text-primary-300"
          >
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </>
  );
}

const iconButtonClass =
  'shrink-0 text-neutral-500 hover:text-neutral-200 focus-visible:outline-none';

const moveHighlightClass = 'text-dark bg-primary-100 rounded-xs shadow-[0_0_0_2px_var(--color-primary-100)]';

function MoveList({ moves, indices, highlighted }: { moves: string[]; indices?: number[]; highlighted: number }) {
  return (
    <>
      {moves.map((move, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : ''}
          <span className={highlighted >= 0 && (indices ? indices[i] : i) === highlighted ? moveHighlightClass : ''}>
            {move}
          </span>
        </Fragment>
      ))}
    </>
  );
}

interface BreakdownLine {
  segment: F2lSegment;
  // where this segment's moves sit in the breakdown's own move order
  positions: number[];
}

interface BreakdownRow {
  name?: F2lGroupName;
  lines: BreakdownLine[];
}

function SegmentRow({ segment, positions, playingBreakdown, highlighted }: BreakdownLine & {
  playingBreakdown: boolean;
  highlighted: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-medium tracking-normal text-neutral-300" style={{ wordSpacing: '8px' }}>
        <MoveList
          moves={segment.moves}
          indices={playingBreakdown ? positions : segment.rawIndices ?? []}
          highlighted={highlighted}
        />
      </span>
      {segment.label && <span className="shrink-0 text-sm text-neutral-300">{renderTerms(segment.label)}</span>}
    </div>
  );
}

const F2lAlgCard =({ alg, steps, cross, caseState, pairColors, yTurns, colorConfig, isPlaying, highlightedMove, isFavorited, onPlay, onToggleFavorite }: F2lAlgCardProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [parrotAnimating, setParrotAnimating] = useState(false);
  const [playingBreakdown, setPlayingBreakdown] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const labeled = useMemo(() => labelF2lAlg(alg, caseState, pairColors), [alg, caseState, pairColors]);
  const hasNotableDropdown = !!labeled?.some((row) =>
    row.segments.some((segment) => segment.label !== undefined && !UNINFORMATIVE_LABELS.has(segment.label))
  );

  const tokens = useMemo(() => tokenize(alg), [alg]);
  const showsBreakdown = hasNotableDropdown && open;

  const breakdown = useMemo(() => {
    const rows: BreakdownRow[] = [];
    const moves: string[] = [];
    const toToken: number[] = [];
    for (const row of labeled ?? []) {
      const lines: BreakdownLine[] = [];
      for (const segment of row.segments) {
        lines.push({ segment, positions: segment.moves.map((_, i) => moves.length + i) });
        moves.push(...segment.moves);
        toToken.push(...(segment.rawIndices ?? []));
      }
      rows.push({ name: row.name, lines });
    }
    return { rows, playbackAlg: moves.join(' '), toToken };
  }, [labeled]);

  // the index counts moves in whichever form is animating, so translate it for the other one
  const highlighted = isPlaying ? highlightedMove : -1;
  const highlightedToken = playingBreakdown ? breakdown.toToken[highlighted] ?? -1 : highlighted;

  // rotate the pair icon by the view angle plus the alg's own net rotation
  const algTurns = useMemo(() => netAlgYTurns(alg), [alg]);
  const iconTurns = yTurns + algTurns;

  const handleCopy = () => {
    navigator.clipboard?.writeText(alg).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1200);
    });
  };

  const handlePlay = () => {
    setPlayingBreakdown(showsBreakdown);
    onPlay(showsBreakdown ? breakdown.playbackAlg : alg);
  };

  const handleToggleFavorite = () => {
    onToggleFavorite();
    if (!isFavorited) setParrotAnimating(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusSiblingCard(e.currentTarget, 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusSiblingCard(e.currentTarget, -1);
      return;
    }
    // remaining hotkeys only when the card itself (not a button inside it) has focus
    if (e.target !== e.currentTarget) return;
    if (e.key === ' ') {
      e.preventDefault();
      handlePlay();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      handleToggleFavorite();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      handleCopy();
    }
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a')) return;
    if (hasNotableDropdown) setOpen((prev) => !prev);
  };

  return (
    <div
      data-f2l-card
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleCardClick}
      // colors here control caret dropdown + breakdown panel (via inheritance / group-hover)
      className={`group flex flex-col rounded-sm border transition-colors
        has-[button:hover]:text-neutral-500 text-neutral-500 hover:text-neutral-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900
        ${isPlaying ? 'bg-primary-800 border-primary-100 shadow-md' : 'bg-dark border-neutral-600 hover:border-neutral-500'}`}
    >
      <div className="flex flex-row items-center p-1 gap-1">
        <span className="flex shrink-0 items-center pr-1">
          {steps.map((step, j) => {
            const descriptor = pairDescriptor(step, cross, iconTurns, colorConfig);
            return descriptor ? (
              <PairIcon key={j} descriptor={descriptor} title={step} />
            ) : (
              <span key={j} className="text-xs text-wrap text-neutral-200">{step}</span>
            );
          })}
        </span>

        <span className="grow min-w-0 text-primary-100 tracking-wide wrap-break-word text-md">
          <MoveList moves={tokens} highlighted={showsBreakdown ? -1 : highlightedToken} />
        </span>

        <span className="relative flex shrink-0 items-center">
          {copied && (
            <span
              aria-hidden="true"
              className="absolute right-full top-1/2 mr-1 -translate-y-1/2 whitespace-nowrap rounded border border-primary-400 bg-neutral-800 px-1.5 py-0.5 text-xs font-medium text-primary-100"
            >
              Copied!
            </span>
          )}
          <button
            type="button"
            aria-label={copied ? 'Copied' : 'Copy alg'}
            title={copied ? 'Copied' : 'Copy alg'}
            className={`${iconButtonClass} ${copied ? 'text-primary-400' : ''}`}
            onClick={handleCopy}
          >
            <CopyIcon />
          </button>
        </span>

        <button
          type="button"
          aria-label={isFavorited ? 'Remove from Your Algs' : 'Save to Your Algs'}
          title={isFavorited ? 'Remove from Your Algs' : 'Save to Your Algs'}
          aria-pressed={isFavorited}
          className={`${iconButtonClass} ${isFavorited ? 'text-primary-400' : ''}`}
          onClick={handleToggleFavorite}
        >
          <Parrot
            filled={isFavorited}
            animating={parrotAnimating}
            onAnimationEnd={(event) => { if (event.animationName === 'parrot-squawk') setParrotAnimating(false); }}
          />
        </button>

        <button
          type="button"
          aria-label={isPlaying ? 'Stop alg' : 'Play alg'}
          title={isPlaying ? 'Stop alg' : 'Play alg'}
          className={`${iconButtonClass} ${isPlaying ? 'text-primary-400' : ''}`}
          onClick={handlePlay}
        >
          {isPlaying ? <StopIcon className="translate-x-[0.13em]" /> : <PlayIcon />}
        </button>

        <div
          id="dropdown-btn"
          aria-label={open ? 'Hide breakdown' : 'Show breakdown'}
          aria-expanded={open}
          className={`iconButtonClass ${hasNotableDropdown? 'visible' : 'invisible'}`}
        >
          <DropdownIcon className={`text-lg transition-transform duration-300 ${open ? '' : 'rotate-180'}`} />
        </div>
      </div>

      {showsBreakdown && (
        <div className="flex flex-col gap-1 border-t border-neutral-600 group-hover:border-neutral-500 font-medium px-2 py-1.5">
          {breakdown.rows.map((row, i) =>
            row.name === undefined ? (
              <SegmentRow
                key={i}
                {...row.lines[0]}
                playingBreakdown={playingBreakdown}
                highlighted={highlighted}
              />
            ) : (
              <fieldset
                key={i}
                className="rounded-sm border border-neutral-700 group-hover:border-neutral-600 px-2 pb-1"
              >
                <legend className="px-1 text-xs tracking-wide text-neutral-400">{renderTerms(row.name)}</legend>
                <div className="flex flex-col gap-1">
                  {row.lines.map((line, j) => (
                    <SegmentRow
                      key={j}
                      {...line}
                      playingBreakdown={playingBreakdown}
                      highlighted={highlighted}
                    />
                  ))}
                </div>
              </fieldset>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default F2lAlgCard;
