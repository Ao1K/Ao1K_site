import { memo, type ComponentProps, type ReactNode } from 'react';
import LockIcon from '../icons/lock';
import UnlockIcon from '../icons/unlock';
import UnfoldedCube from './UnfoldedCube';

export const MIN_LINE_PCT = 1;

const formatNumber = (n: number, decimals = 2) => {
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(decimals).replace(/\.?0+$/, '');
};

export interface LineEntry {
  index: number;
  moves: string[];
  // moveDurations are cube-animation durations in ms for each move
  moveDurations: number[];
  totalCubeDuration: number;
  // splitIdx points into the splits[] array
  splitIdx: number;
}

export interface LineConfigItemProps {
  entry: LineEntry;
  idx: number;
  pct: number;
  totalDuration: number;
  locked: boolean;
  effectiveDelay: number;
  individualDelays: boolean;
  isCustomizing: boolean;
  lineHighlight: Set<string>;
  cubeColors: ComponentProps<typeof UnfoldedCube>['cubeColors'];
  icon: ReactNode;
  onAdjustPercentage: (idx: number, pct: number) => void;
  onSetSplitSeconds: (idx: number, seconds: number) => void;
  onToggleLock: (idx: number) => void;
  onSetLineDelay: (idx: number, seconds: number) => void;
  onToggleHighlightPiece: (lineIdx: number, piece: string) => void;
}

const LineConfigItem = memo(function LineConfigItem({
  entry,
  idx,
  pct,
  totalDuration,
  locked,
  effectiveDelay,
  individualDelays,
  isCustomizing,
  lineHighlight,
  cubeColors,
  icon,
  onAdjustPercentage,
  onSetSplitSeconds,
  onToggleLock,
  onSetLineDelay,
  onToggleHighlightPiece,
}: LineConfigItemProps) {
  const seconds = (pct / 100) * totalDuration;
  const movePreview = entry.moves.join(' ');

  return (
    <li className="rounded-sm border border-neutral-600 bg-dark/30 py-2 px-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {icon}
          <span className="font-mono text-xs text-neutral-300 truncate" title={movePreview}>
            {movePreview || '(empty)'}
          </span>
        </div>
        <input
          id={`gif-line-duration-${idx}`}
          type="number"
          min={0.05}
          step={0.001}
          value={formatNumber(seconds, 3)}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v > 0) onSetSplitSeconds(idx, v);
          }}
          className={`w-16 no-spinner rounded-sm border border-neutral-600 bg-dark/40 
          px-1 py-1 text-right font-mono text-xs text-primary-100 outline-none focus:border-primary-100
          ${locked ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          disabled={locked}
        />
        <span className="text-neutral-400 pl-1 pr-2 text-xs">s</span>
        <button
          type="button"
          onClick={() => onToggleLock(idx)}
          className={`rounded border px-1 py-1 transition-colors ${
            locked ? 'border-primary-100 text-primary-100' : 'border-neutral-600 text-neutral-300 hover:border-primary-100 hover:text-primary-100'
          }`}
          aria-label={locked ? 'Unlock time' : 'Lock time'}
          title={locked ? 'Unlock time' : 'Lock time'}
        >
          {locked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className={`flex flex-col items-center h-4 -mt-4 gap-0.5 ${!individualDelays ? 'hidden' : ''}`}>
          {/* {idx === 0 && (
            <span className="text-xs text-neutral-500">Pause</span>
          )} */}
          <div className="flex items-center gap-1">
            <input
              id={`gif-line-delay-${idx}`}
              type="number"
              min={0}
              step="any"
              value={formatNumber(effectiveDelay, 2)}
              disabled={!individualDelays}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v >= 0) onSetLineDelay(idx, v);
              }}
              className={`w-12 no-spinner rounded-sm border border-neutral-600 bg-dark/40 px-1 py-1 text-right font-mono text-xs text-primary-100 outline-none focus:border-primary-100 ${
                !individualDelays ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <span className="text-xs text-neutral-400 mr-4">s</span>
          </div>
        </div>
        <input
          id={`gif-line-range-${idx}`}
          type="range"
          min={MIN_LINE_PCT}
          max={99}
          value={pct}
          disabled={locked}
          onChange={e => onAdjustPercentage(idx, parseFloat(e.target.value))}
          className="flex-1 cursor-pointer accent-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="w-6 text-right font-mono text-xs text-neutral-300">
          {pct.toFixed(0)}%
        </span>
      </div>
      {isCustomizing ? (
        <div className="mt-2 border-t border-neutral-600 pt-2">
          <UnfoldedCube
            selected={lineHighlight}
            onToggle={piece => onToggleHighlightPiece(idx, piece)}
            cubeColors={cubeColors}
          />
        </div>
      ) : null}
    </li>
  );
});

export default LineConfigItem;
