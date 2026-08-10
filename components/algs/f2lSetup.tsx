'use client';

import { useEffect } from 'react';
import CaretIcon from '../icons/dropdown';
import {
  F2L_SLOT_PIECES,
  CORNER_LOC_FACES,
  EDGE_LOC_FACES,
  f2lPairHomeSlot,
  f2lSlotOf,
  freeEoEdgeSet,
  type FaceKey,
  type CornerLocation,
  type EdgeLocation,
  type CornerOrientation,
  type EdgeOrientation,
  type F2lSlot,
  type PieceRef,
} from '../../composables/algs/cubePaint';
import {
  DEFAULT_F2L_CONFIG,
  STEP,
  initialFullEO,
  isF2lConfigured,
  isFullEOValid,
  isSlotFillable,
  type F2lCaseConfig,
} from '../../composables/algs/f2lCaseId';

export { DEFAULT_F2L_CONFIG, STEP, isF2lConfigured, type F2lCaseConfig };

// `name` labels the progress segment, `label` is the instruction shown over the cube
export const STEPS: { name: string; label: string }[] = [
  { name: 'Angle', label: 'Choose angle' },
  { name: 'Pieces', label: 'Click to place edge and corner\nClick again to twist piece' },
  { name: 'Slots', label: 'Click a slot to mark it solved or unsolved' },
  { name: 'EO', label: 'Click edges to toggle EO (Optional)' },
];

// drops the slot a piece location belongs to, if any.
// Top-layer pieces belong to no slot
function unmarkSlotAt(filledSlots: F2lSlot[], piece: PieceRef): F2lSlot[] {
  const slot = f2lSlotOf(piece);
  return slot ? filledSlots.filter((s) => s !== slot) : filledSlots;
}

export function placeCorner(config: F2lCaseConfig, loc: CornerLocation): F2lCaseConfig {
  return {
    ...config,
    corner: { loc, orientation: 0 },
    // a placed piece and a solved slot can't share a location, so unmark the slot first
    filledSlots: unmarkSlotAt(config.filledSlots, { pieceType: 'CORNERS', loc }),
  };
}

export function twistCorner(config: F2lCaseConfig): F2lCaseConfig {
  if (!config.corner) return config;
  const orientation = (((config.corner.orientation + 1) % 3) as CornerOrientation);
  return { ...config, corner: { ...config.corner, orientation } };
}

export function placeEdge(config: F2lCaseConfig, loc: EdgeLocation): F2lCaseConfig {
  return {
    ...config,
    edge: { loc, orientation: 0 },
    // a placed piece and a solved slot can't share a location, so unmark the slot first
    filledSlots: unmarkSlotAt(config.filledSlots, { pieceType: 'EDGES', loc }),
  };
}

// flip the placed edge in place (good ↔ bad)
export function flipEdge(config: F2lCaseConfig): F2lCaseConfig {
  if (!config.edge) return config;
  const orientation = ((config.edge.orientation ^ 1) as EdgeOrientation);
  return { ...config, edge: { ...config.edge, orientation } };
}

export function toggleSlot(
  config: F2lCaseConfig,
  slot: F2lSlot,
  cross: FaceKey,
  pair: [FaceKey, FaceKey],
): F2lCaseConfig {
  if (config.filledSlots.includes(slot)) {
    return { ...config, filledSlots: config.filledSlots.filter((s) => s !== slot) };
  }
  const home = f2lPairHomeSlot(cross, pair, config.yTurns);
  if (!isSlotFillable(slot, config.corner?.loc, config.edge?.loc, home)) return config;

  return { ...config, filledSlots: [...config.filledSlots, slot] };
}

// highlighted pieces indicate active step
export function highlightedPieces(
  config: F2lCaseConfig,
  cross: FaceKey,
  pair: [FaceKey, FaceKey],
): PieceRef[] {
  switch (config.step) {
    case STEP.F2L: {
      const taken = config.filledSlots.map((slot) => F2L_SLOT_PIECES[slot]);
      const pieces: PieceRef[] = [];
      for (const loc of Object.keys(CORNER_LOC_FACES) as CornerLocation[]) {
        if (!taken.some((p) => p.corner === loc)) pieces.push({ pieceType: 'CORNERS', loc });
      }
      for (const loc of Object.keys(EDGE_LOC_FACES) as EdgeLocation[]) {
        if (!taken.some((p) => p.edge === loc)) pieces.push({ pieceType: 'EDGES', loc });
      }
      return pieces;
    }
    case STEP.SLOTS: {
      const home = f2lPairHomeSlot(cross, pair, config.yTurns);
      const pieces: PieceRef[] = [];
      for (const slot of Object.keys(F2L_SLOT_PIECES) as F2lSlot[]) {
        if (config.filledSlots.includes(slot)) continue;
        if (!isSlotFillable(slot, config.corner?.loc, config.edge?.loc, home)) continue;
        const { corner, edge } = F2L_SLOT_PIECES[slot];
        pieces.push({ pieceType: 'CORNERS', loc: corner }, { pieceType: 'EDGES', loc: edge });
      }
      return pieces;
    }
    default:
      return [];
  }
}

// toggles a free edge's Full EO orientation (good ↔ bad); determined edges are ignored
export function toggleFullEOEdge(config: F2lCaseConfig, loc: EdgeLocation): F2lCaseConfig {
  if (config.fullEO == null) return config;
  const free = freeEoEdgeSet(config.edge?.loc ?? null, config.filledSlots);
  if (!free.includes(loc)) return config;
  const isBad = config.fullEO.includes(loc);
  return {
    ...config,
    fullEO: isBad ? config.fullEO.filter((l) => l !== loc) : [...config.fullEO, loc],
  };
}

export function goToStep(config: F2lCaseConfig, step: number): F2lCaseConfig {
  // Slots and EO stay locked until a corner and an edge are both placed
  if (step > STEP.F2L && !isF2lConfigured(config)) return config;
  const next: F2lCaseConfig = { ...config, step };
  // Full EO lives only while on its step: seed it on entry, discard it on leaving
  if (step === STEP.EO) return { ...next, fullEO: config.fullEO ?? initialFullEO(config) };
  return { ...next, fullEO: null };
}

function isStepComplete(config: F2lCaseConfig, i: number): boolean {
  switch (i) {
    case STEP.ORIENT:
      return config.step > STEP.ORIENT;
    case STEP.F2L:
      return isF2lConfigured(config);
    case STEP.SLOTS:
      return config.step > STEP.SLOTS;
    case STEP.EO:
      return config.fullEO != null && isFullEOValid(config);
    default:
      return false;
  }
}

interface F2lSetupProps {
  config: F2lCaseConfig;
  onConfigChange: (config: F2lCaseConfig) => void;
  showEO: boolean;
}

const F2lSetup = ({ config, onConfigChange, showEO }: F2lSetupProps) => {
  const steps = showEO ? STEPS : STEPS.slice(0, STEP.EO);
  const stepCount = steps.length;
  const locked = !isF2lConfigured(config);
  const lastStep = locked ? STEP.F2L : stepCount - 1;
  const atStart = config.step <= 0;
  const atEnd = config.step >= lastStep;

  const goBack = () => onConfigChange(goToStep(config, Math.max(0, config.step - 1)));
  const goForward = () => onConfigChange(goToStep(config, Math.min(lastStep, config.step + 1)));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // an alg card's own hotkeys (space to play) claim the key before it reaches the window
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault();
        goForward();
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const keyCap = (label: string) => (
    <kbd
      key={label}
      className="rounded border border-neutral-500 px-2 py-0.5 text-sm leading-none text-primary-100"
    >
      {label}
    </kbd>
  );

  const navButton = (onClick: () => void, disabled: boolean, rotate: string, label: string, reverse: boolean, keys: string[]) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex-auto flex items-center justify-center gap-2 py-2 text-sm text-dark_accent enabled:hover:bg-primary-800
        disabled:text-neutral-700
        ${reverse ? 'flex-row-reverse border-l border-neutral-700' : ''}`}
    >
      <CaretIcon className={`text-xl ${rotate}`} />
      {label}
      {/* Hide on small screens. Assume touch only, so no need for hints */}
      <div className="hidden md:flex">
        <span
          className={`flex items-center gap-1.5 whitespace-nowrap opacity-0 transition-opacity ${
            disabled ? '' : 'group-hover:opacity-100 group-hover:delay-100'
          }`}
        >
          {keys.flatMap((k, i) =>
            i === 0 ? [keyCap(k)] : [<span key={`or-${i}`} className="text-dark_accent">or</span>, keyCap(k)]
          )}
        </span>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col w-full bg-dark rounded-b-sm">
      <div className="relative flex w-full h-5 overflow-hidden bg-dark">
        {steps.map((step, i) => {
          const active = i === config.step;
          const complete = isStepComplete(config, i);
          const disabled = locked && i > STEP.F2L;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onConfigChange(goToStep(config, i))}
              className={`flex flex-1 items-center justify-center skew-x-[-24deg] enabled:hover:bg-primary-200 ${
                active ? 'bg-primary-100' : complete ? 'bg-primary-300' : disabled ? 'bg-neutral-800' : 'bg-neutral-700'
              } ${i === 0 ? '-ml-2' : ''} ${i === stepCount - 1 ? '-mr-2' : ''}`}
            >
              {/* counter-skew so the label reads straight inside the slanted segment */}
              <span
                className={`skew-x-24 text-[10px] leading-none ${
                  active || complete ? 'text-dark' : disabled ? 'text-dark_accent/25' : 'text-dark_accent/60'
                }`}
              >
                {step.name}
              </span>
            </button>
          );
        })}
        {Array.from({ length: stepCount - 1 }, (_, i) => {
          const pct = ((i + 1) / stepCount) * 100;
          const offset = ((i + 1) * 16) / stepCount - 8 - 1.5; // bleed contribution minus half the divider
          return (
            <span
              key={`divider-${i}`}
              aria-hidden
              className="pointer-events-none absolute top-0 h-full w-0.75 skew-x-[-24deg] bg-dark"
              style={{ left: `calc(${pct}% + ${offset}px)` }}
            />
          );
        })}
      </div>

      {/* previous / next — each fills half the width */}
      <div className="flex w-full border-t border-neutral-700">
        {navButton(goBack, atStart, 'rotate-90', 'Prev', false, ['←'])}
        {navButton(goForward, atEnd, '-rotate-90', 'Next', true, ['Space', '→'])}
      </div>
    </div>
  );
};

export default F2lSetup;
