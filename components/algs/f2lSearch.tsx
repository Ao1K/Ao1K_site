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
// import F2lAdvancedInput from './f2lAdvancedInput';
import TwistyClickable, { type LocationClick, type TwistyClickableHandle } from './TwistyClickable';
import ReplayIcon from '../icons/replay';
import F2lSuggestions from './f2lSuggestions';
import type { Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import {
  pairsForCross,
  f2lSlotOf,
  f2lPairHomeSlot,
  rotateCornerLocY,
  rotateEdgeLocY,
  rotateSlotY,
  isTopEdge,
  type FaceKey,
  type CornerOrientation,
  type EdgeLocation,
  type EdgeOrientation,
} from '../../composables/algs/cubePaint';
import { configToRaw, encodePrefixFromState } from '../../composables/algs/f2lCaseId';

const DEFAULT_PAIR = pairsForCross('up')[0];

// the default cross/pair is assumed when p is absent, so omit it to keep a reset URL clean
const isDefaultSelection = (cross: FaceKey, pair: [FaceKey, FaceKey]): boolean =>
  cross === 'up' && pair[0] === DEFAULT_PAIR[0] && pair[1] === DEFAULT_PAIR[1];

// the case (`c`) and cross/pair selection (`p`) are mirrored into the URL so a search survives
// reload and can be shared. written only from the events that change state, never on render.
function writeF2lURL(cross: FaceKey, pair: [FaceKey, FaceKey], config: F2lCaseConfig) {
  const params = new URLSearchParams(window.location.search);
  const raw = configToRaw(config);
  const setParam = (key: string, value: string | null) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };
  setParam('c', raw.length > 2 ? raw : null);
  setParam('p', isDefaultSelection(cross, pair) ? null : encodePrefixFromState(cross, pair));
  const qs = params.toString();
  window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

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
  const [highlightedMove, setHighlightedMove] = useState(-1);

  // drops any running alg and returns the cube to the case it was showing beforehand
  const stopPlayback = () => {
    twistyRef.current?.reset();
    setPlayingAlg(null);
    setHighlightedMove(-1);
  };

  // every state change routes through one of these so the URL is updated in lockstep, at the
  // event, rather than reactively after render.
  const commitConfig = (next: F2lCaseConfig) => {
    if (playingAlg) stopPlayback();
    setConfig(next);
    writeF2lURL(cross, pair, next);
  };

  const commitSelection = (nextCross: FaceKey, nextPair: [FaceKey, FaceKey], nextConfig: F2lCaseConfig) => {
    if (playingAlg) stopPlayback();
    setCross(nextCross);
    setPair(nextPair);
    setConfig(nextConfig);
    writeF2lURL(nextCross, nextPair, nextConfig);
  };

  const handlePlay = (alg: string, playbackAlg: string) => {
    if (playingAlg === alg) {
      stopPlayback();
      return;
    }
    setPlayingAlg(alg);
    const isInViewport = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    };
    const visualizer = document.querySelector('#f2l-visualizer');
    if (visualizer instanceof HTMLElement && !isInViewport(visualizer)) {
      visualizer.scrollIntoView({behavior: 'smooth'});
    }
    twistyRef.current?.playAlg(playbackAlg);
  };

  // stable so TwistyClickable's prop-sync effect doesn't re-run every render
  const handlePlaybackEnd = useCallback(() => setPlayingAlg(null), []);
  const handleHighlightMove = useCallback((moveIndex: number) => setHighlightedMove(moveIndex), []);

  // drop a filled slot that would now duplicate the selected pair's solved home
  const dropPairHome = (nextCross: FaceKey, nextPair: [FaceKey, FaceKey], c: F2lCaseConfig): F2lCaseConfig => {
    const home = f2lPairHomeSlot(nextCross, nextPair, c.yTurns);
    return home ? { ...c, filledSlots: c.filledSlots.filter((s) => s !== home) } : c;
  };

  const handleCrossChange = (face: FaceKey) => {
    // keep the pair valid for the newly chosen cross
    const nextPair = pairsForCross(face)[0];
    commitSelection(face, nextPair, dropPairHome(face, nextPair, config));
  };

  const handlePairChange = (nextPair: [FaceKey, FaceKey]) => {
    commitSelection(cross, nextPair, dropPairHome(cross, nextPair, config));
  };

  // back to a blank setup; commitSelection clears the case (and default p) from the URL
  const handleReset = () => {
    commitSelection('up', pairsForCross('up')[0], DEFAULT_F2L_CONFIG);
  };

  const handleTurnY = (delta: number) => {
    const odd = ((((delta % 4) + 4) % 4) % 2) === 1;
    const swapCO = (o: CornerOrientation): CornerOrientation => (odd ? (o === 0 ? 0 : o === 1 ? 2 : 1) : o);
    const swapEO =(loc: EdgeLocation, o: EdgeOrientation): EdgeOrientation =>
      odd && isTopEdge(loc) ? (o === 0 ? 1 : 0) : o;
    commitConfig({
      ...config,
      yTurns: config.yTurns + delta,
      corner: config.corner ? { loc: rotateCornerLocY(config.corner.loc, delta), orientation: swapCO(config.corner.orientation) } : null,
      edge: config.edge ? { loc: rotateEdgeLocY(config.edge.loc, delta), orientation: swapEO(config.edge.loc, config.edge.orientation) } : null,
      filledSlots: config.filledSlots.map((s) => rotateSlotY(s, delta)),
      fullEO: config.fullEO ? config.fullEO.map((l) => rotateEdgeLocY(l, delta)) : null,
    });
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
  // in the Slots step, a click on a free bottom-corner/middle-edge fills that slot.
  const handleCubeClick = (click: LocationClick) => {
    if (playingAlg) return;
    const c = config;
    let next: F2lCaseConfig;
    if (c.step === STEP.ORIENT) return;
    if (c.step === STEP.EO) {
      next = click.pieceType === 'EDGES' ? toggleFullEOEdge(c, click.loc) : c;
    } else if (c.step === STEP.SLOTS) {
      const slot = f2lSlotOf(click);
      next = slot ? toggleSlot(c, slot, cross, pair) : c;
    } else if (click.pieceType === 'CORNERS') {
      next = c.corner?.loc === click.loc ? twistCorner(c) : placeCorner(c, click.loc);
    } else {
      next = c.edge?.loc === click.loc ? flipEdge(c) : placeEdge(c, click.loc);
    }
    // the helpers return the same config on a no-op click, so don't rewrite the URL needlessly
    if (next !== c) commitConfig(next);
  };

  return (
    <div className="grid w-full max-w-220 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="flex flex-col items-start gap-4 min-w-0">
        <div id="f2l-visualizer" className="flex flex-col w-full border border-neutral-600 rounded-sm bg-black">
          <div className="flex flex-row items-center justify-between gap-2 mb-2 px-3 py-2 bg-dark border-b border-neutral-600 rounded-t-sm">
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
              onLocationClick={handleCubeClick}
              onPlaybackEnd={handlePlaybackEnd}
              onHighlightMove={handleHighlightMove}
            />
            <h2 className="pointer-events-none absolute inset-x-0 top-2 whitespace-pre-line text-center text-sm font-medium text-primary-100">
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
          <F2lSetup config={config} onConfigChange={commitConfig} />
        </div>

        {/* Disabled. Works, but doesn't seem very useful in testing */}
        {/* <F2lAdvancedInput
          config={config}
          setConfig={commitConfig}
          cross={cross}
          pair={pair}
        /> */}
      </div>
      <F2lSuggestions config={config} cross={cross} pair={pair} suggestions={suggestions} ready={ready} playingAlg={playingAlg} highlightedMove={highlightedMove} onPlay={handlePlay} />
    </div>
  );
};

export default F2lSearch;
