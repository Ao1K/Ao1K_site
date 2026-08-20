'use client';

import { useMemo } from 'react';
import { type Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import { type FaceKey } from '../../composables/algs/cubePaint';
import { buildF2lCubeState } from '../../composables/algs/f2lCubeState';
import type { Color } from '../../composables/recon/SimpleCube';
import { simplePairIcon, type ColorConfig } from '../../composables/recon/stepIconDescriptors';
import ReplayIcon from '../icons/replay';
import { IconSvg } from './f2lDefaults';
import { useCubeColors } from '../../composables/useSettings';
import { useAlgFavorites } from '../../composables/algs/algFavorites';
import F2lAlgCard from './f2lAlgCard';
import type { F2lCaseConfig } from './f2lSetup';
import { isFullEOActive, isFullEOValid, isPairSolved } from '../../composables/algs/f2lCaseId';

interface F2lSuggestionsProps {
  config: F2lCaseConfig;
  cross: FaceKey;
  pair: [FaceKey, FaceKey];
  suggestions: Suggestion[];
  ready: boolean;
  // the alg currently being animated on the cube, if any
  playingAlg?: string | null;
  // index of the move being animated, highlighted on the playing card
  highlightedMove?: number;
  // request playback on the shared cube; `alg` identifies the suggestion, `playbackAlg` is the
  // form to animate, which is the breakdown's split-up moves when its dropdown is open
  onPlay?: (alg: string, playbackAlg: string) => void;
}

const COLOR_OF: Record<FaceKey, Color> = {
  up: 'W', down: 'Y', front: 'G', right: 'R', back: 'B', left: 'O',
};

function NoSolutionsDisclaimer() {
  return (
    <>
      <p className="text-dark_accent pb-2">No solutions found</p>
      <p className="text-neutral-300 text-xs">{`Some cases aren't worth solving. If this one is worth it, offer a solution`}{" "}
        <a
          href="https://discord.gg/WMm6JBgt2W"
          target="_blank"
          rel="noopener noreferrer"
          className="gap-2 hover:text-primary-100 underline underline-offset-2"
        >
          on the Discord
        </a>
        {" "}and we can add it!
      </p>
    </>
  )
}

function PairSolvedDisclaimer({ colorA, colorB }: { colorA: string; colorB: string }) {
  const pairIcon = (
    <IconSvg
      descriptor={simplePairIcon(colorA, colorB)}
      className="inline-block align-middle w-9 h-9 mx-1"
    />
  );
  return (
    <p className="text-dark_accent leading-11">
      {`You've entered the solved case for the`}{pairIcon}{`pair. Change the piece placement. Or, if you want to mark the`}{pairIcon}
      {`slot as solved, change the color settings next to the`}
      <span className="inline-flex align-middle mx-1 h-9 w-9 items-center justify-center rounded-sm border border-neutral-600 text-dark_accent">
        <ReplayIcon className="text-lg" />
      </span>
      {`button.`}
    </p>
  )
}

const F2lSuggestions = ({ config, cross, pair, suggestions, ready, playingAlg, highlightedMove = -1, onPlay }: F2lSuggestionsProps) => {
  const [cubeColors] = useCubeColors();
  const { isFavorite, toggleFavorite } = useAlgFavorites();

  // need both pieces placed before there's a pair to solve
  const hasPair = config.corner != null && config.edge != null;

  // with Full EO engaged, only show algs that also solve EO; an odd flip count is illegal
  const eoActive = isFullEOActive(config);
  const eoValid = isFullEOValid(config);
  const pairSolved = isPairSolved(config, cross, pair);
  const shownSuggestions = useMemo(
    () => (eoActive && eoValid ? suggestions.filter((s) => s.hasEOsolved) : suggestions),
    [suggestions, eoActive, eoValid],
  );

  const caseState = useMemo(
    () => (hasPair && eoValid ? buildF2lCubeState(config, cross, pair) : null),
    [hasPair, eoValid, config, cross, pair],
  );
  const pairColors = useMemo<[Color, Color]>(() => [COLOR_OF[pair[0]], COLOR_OF[pair[1]]], [pair]);

  const colorConfig: ColorConfig = useMemo(
    () => ({
      up: cubeColors.up,
      down: cubeColors.down,
      front: cubeColors.front,
      back: cubeColors.back,
      right: cubeColors.right,
      left: cubeColors.left,
      gray: '#888888',
      darkBg: '#161018',
    }),
    [cubeColors],
  );

  return (
    <div className="flex flex-col border border-neutral-600 rounded-sm text-lg text-primary-100 w-full h-full min-h-50">
      <div className="flex flex-row items-center gap-2 py-2 px-3 min-h-[62] bg-dark border-b rounded-t-sm border-neutral-600">
        <h2 className="text-sm text-primary-100 font-medium">{ shownSuggestions.length === 1 ? "Solution" : "Solutions"}</h2>
      </div>

      <div className="p-3">
        {!ready && <p className="text-dark_accent">Loading algorithms…</p>}

        {ready && hasPair && pairSolved && (
          <PairSolvedDisclaimer colorA={cubeColors[pair[0]]} colorB={cubeColors[pair[1]]} />
        )}
        {ready && hasPair && !pairSolved && eoActive && !eoValid && (
          <p className="text-dark_accent">Fix full EO to see solutions</p>
        )}
        {ready && hasPair && !pairSolved && (!eoActive || eoValid) && shownSuggestions.length === 0 && <NoSolutionsDisclaimer />}
        {ready && hasPair && !pairSolved && (!eoActive || eoValid) && shownSuggestions.length > 0 && (
          <ul className="flex flex-col gap-2">
            {shownSuggestions.map((s, i) => (
              <li key={`${s.alg}-${i}`}>
                <F2lAlgCard
                  alg={s.alg}
                  steps={s.steps}
                  cross={cross}
                  caseState={caseState}
                  pairColors={pairColors}
                  yTurns={config.yTurns}
                  colorConfig={colorConfig}
                  isPlaying={playingAlg === s.alg}
                  highlightedMove={playingAlg === s.alg ? highlightedMove : -1}
                  isFavorited={isFavorite(s.alg)}
                  onPlay={(playbackAlg) => onPlay?.(s.alg, playbackAlg)}
                  onToggleFavorite={() => toggleFavorite(s.alg)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default F2lSuggestions;
