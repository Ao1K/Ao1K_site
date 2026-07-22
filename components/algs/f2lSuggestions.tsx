'use client';

import { useMemo } from 'react';
import { type Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import { type FaceKey } from '../../composables/algs/cubePaint';
import { type ColorConfig } from '../../composables/recon/stepIconDescriptors';
import { useCubeColors } from '../../composables/useSettings';
import { useAlgFavorites } from '../../composables/algs/algFavorites';
import F2lAlgCard from './f2lAlgCard';
import type { F2lCaseConfig } from './f2lSetup';
import { isFullEOActive, isFullEOValid } from '../../composables/algs/f2lCaseId';

interface F2lSuggestionsProps {
  config: F2lCaseConfig;
  cross: FaceKey;
  pair: [FaceKey, FaceKey];
  suggestions: Suggestion[];
  ready: boolean;
  // the alg currently being animated on the cube, if any
  playingAlg?: string | null;
  // request playback of a suggestion alg on the shared cube
  onPlay?: (alg: string) => void;
}

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

const F2lSuggestions = ({ config, cross, pair, suggestions, ready, playingAlg, onPlay }: F2lSuggestionsProps) => {
  const [cubeColors] = useCubeColors();
  const { isFavorite, toggleFavorite } = useAlgFavorites();

  // need both pieces placed before there's a pair to solve
  const hasPair = config.corner != null && config.edge != null;

  // with Full EO engaged, only show algs that also solve EO; an odd flip count is illegal
  const eoActive = isFullEOActive(config);
  const eoValid = isFullEOValid(config);
  const shownSuggestions = useMemo(
    () => (eoActive && eoValid ? suggestions.filter((s) => s.hasEOsolved) : suggestions),
    [suggestions, eoActive, eoValid],
  );

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

        {/* TODO: add warning message if both pieces are in first two layers: "This is a bad case, solve a different pair!" */}

        {ready && hasPair && eoActive && !eoValid && (
          <p className="text-dark_accent">Fix full EO to see solutions</p>
        )}
        {ready && hasPair && (!eoActive || eoValid) && shownSuggestions.length === 0 && <NoSolutionsDisclaimer />}
        {ready && hasPair && (!eoActive || eoValid) && shownSuggestions.length > 0 && (
          <ul className="flex flex-col gap-2">
            {shownSuggestions.map((s, i) => (
              <li key={`${s.alg}-${i}`}>
                <F2lAlgCard
                  alg={s.alg}
                  steps={s.steps}
                  cross={cross}
                  yTurns={config.yTurns}
                  colorConfig={colorConfig}
                  isPlaying={playingAlg === s.alg}
                  isFavorited={isFavorite(s.alg)}
                  onPlay={() => onPlay?.(s.alg)}
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
