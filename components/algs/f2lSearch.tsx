'use client';

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import F2lDefaults from './f2lDefaults';
import F2lSetup, {
  STEP,
  STEPS,
  DEFAULT_F2L_CONFIG,
  placeCorner,
  twistCorner,
  placeEdge,
  flipEdge,
  toggleSlot,
  toggleFullEOEdge,
  highlightedPieces,
  type F2lCaseConfig,
} from './f2lSetup';
import TwistyClickable, { type LocationClick, type TwistyClickableHandle } from './TwistyClickable';
import ReplayIcon from '../icons/replay';
import F2lAdvancedInput from './f2lAdvancedInput';
import F2lSuggestions from './f2lSuggestions';
import type { Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import { pairsForCross,  f2lSlotOf, f2lPairHomeSlot, type FaceKey } from '../../composables/algs/cubePaint';

interface F2lSearchProps {
  cross: FaceKey;
  setCross: Dispatch<SetStateAction<FaceKey>>;
  pair: [FaceKey, FaceKey];
  setPair: Dispatch<SetStateAction<[FaceKey, FaceKey]>>;
  config: F2lCaseConfig;
  setConfig: Dispatch<SetStateAction<F2lCaseConfig>>;
  suggestions: Suggestion[];
  ready: boolean;
}

const F2lSearch = ({ cross, setCross, pair, setPair, config, setConfig, suggestions, ready }: F2lSearchProps) => {
  // playback runs on the shared cube; track which alg is animating to highlight its card
  const twistyRef = useRef<TwistyClickableHandle>(null);
  const [playingAlg, setPlayingAlg] = useState<string | null>(null);

  const handlePlay = (alg: string) => {
    setPlayingAlg(alg);
    twistyRef.current?.playAlg(alg);
  };

  // stable so TwistyClickable's prop-sync effect doesn't re-run every render
  const handlePlaybackEnd = useCallback(() => setPlayingAlg(null), []);

  // drop a filled slot that would now duplicate the selected pair's solved home
  const dropPairHome = (nextCross: FaceKey, nextPair: [FaceKey, FaceKey]) => {
    const home = f2lPairHomeSlot(nextCross, nextPair);
    if (home) setConfig((c) => ({ ...c, filledSlots: c.filledSlots.filter((s) => s !== home) }));
  };

  const handleCrossChange = (face: FaceKey) => {
    setCross(face);
    // keep the pair valid for the newly chosen cross
    const nextPair = pairsForCross(face)[0];
    setPair(nextPair);
    dropPairHome(face, nextPair);
  };

  const handlePairChange = (nextPair: [FaceKey, FaceKey]) => {
    setPair(nextPair);
    dropPairHome(cross, nextPair);
  };

  // back to a blank setup; the advanced-input effect clears the case (and default p) from the URL
  const handleReset = () => {
    setCross('up');
    setPair(pairsForCross('up')[0]);
    setConfig(DEFAULT_F2L_CONFIG);
  };

  // track the logical y state; the cube follows config.yTurns through its prop
  const handleTurnY = (delta: number) => {
    setConfig((c) => ({ ...c, yTurns: c.yTurns + delta }));
  };

  const yButton = (label: string, delta: number) => (
    <button
      type="button"
      onClick={() => handleTurnY(delta)}
      className="px-3 py-1 rounded-sm border w-14 h-10 border-neutral-600 bg-dark text-primary-100 hover:border-primary-100"
    >
      {label}
    </button>
  );

  // re-clicking the placed piece twists/flips it, any other click (re)places it.
  // the edge is editable only after a corner exists, since its colors derive from it.
  // in the Slots step, a click on a free bottom-corner/middle-edge fills that slot.
  const handleSlotClick = (click: LocationClick) => {
    setConfig((c) => {
      if (c.step === STEP.ORIENT) return c;
      if (c.step === STEP.FULL_EO) {
        return click.pieceType === 'EDGES' ? toggleFullEOEdge(c, click.loc) : c;
      }
      if (c.step === STEP.SLOTS) {
        const slot = f2lSlotOf(click);
        return slot ? toggleSlot(c, slot, cross, pair) : c;
      }
      if (click.pieceType === 'CORNERS') {
        return c.corner?.loc === click.loc ? twistCorner(c) : placeCorner(c, click.loc);
      }
      if (!c.corner) return c;
      return c.edge?.loc === click.loc ? flipEdge(c) : placeEdge(c, click.loc);
    });
  };

  return (
    <div className="grid w-full max-w-220 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="flex flex-col items-start gap-4 min-w-0">
        <div className="flex flex-col w-full border border-neutral-600 rounded-sm bg-black">
          <div className="flex flex-row items-center justify-between gap-2 mb-2 px-3 py-2 bg-dark border-b border-neutral-600">
            <h2 className="text-sm text-primary-100 font-medium">Visual Input</h2>
            <div className="flex items-center gap-2">
              <F2lDefaults cross={cross} pair={pair} onCrossChange={handleCrossChange} onPairChange={handlePairChange} />
              <div className="relative flex flex-col items-center group">
                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Reset setup"
                  className="flex h-9 w-9 items-center justify-center rounded-sm border border-neutral-600 text-dark_accent hover:border-primary-100 hover:text-primary-100 transition-colors"
                >
                  <ReplayIcon className="text-lg" />
                </button>
                <div className="absolute bottom-full mb-2 px-2 py-1 text-primary-100 bg-primary-900 rounded-md text-sm opacity-0 group-hover:opacity-100 pointer-events-none select-none whitespace-nowrap z-30">
                  Reset
                </div>
              </div>
            </div>
          </div>

          {/* keep the cube square by capping width (not height); a height cap would let the
              full-width column stretch it wide. centered so it sits under the heading. */}
          <div className="relative mx-auto w-full max-w-100 aspect-square">
            <TwistyClickable
              ref={twistyRef}
              cross={cross}
              pair={pair}
              corner={config.corner}
              edge={config.edge}
              filledSlots={config.filledSlots}
              highlightedPieces={highlightedPieces(config, cross, pair)}
              eoActive={config.fullEO != null}
              badEdges={config.fullEO ?? []}
              yTurns={config.yTurns}
              onLocationClick={handleSlotClick}
              onPlaybackEnd={handlePlaybackEnd}
            />
            <h2 className="pointer-events-none absolute inset-x-0 top-2 text-center text-sm font-medium text-primary-100">
              {STEPS[config.step].label}
            </h2>
            {config.step === STEP.ORIENT && (
              <div className='absolute inset-x-0 flex flex-col gap-2 top-10 align-top'>
                <div className="flex flex-row justify-center gap-2">
                  {yButton('−y', -1)}
                  {yButton('+y', 1)}
                </div>
                <div className="text-neutral-400 text-xs bg-dark w-fit px-2 py-0.5 mx-auto rounded-sm">Click next to continue</div>
              </div>
            )}
          </div>
          <F2lSetup config={config} onConfigChange={setConfig} />
        </div>
        <F2lAdvancedInput
          config={config}
          setConfig={setConfig}
          cross={cross}
          pair={pair}
        />
      </div>
      <F2lSuggestions config={config} cross={cross} pair={pair} suggestions={suggestions} ready={ready} playingAlg={playingAlg} onPlay={handlePlay} />
    </div>
  );
};

export default F2lSearch;
