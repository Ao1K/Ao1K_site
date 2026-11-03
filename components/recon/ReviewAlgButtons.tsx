import { useRef, useState } from 'react';
import CopyIcon from '../icons/copy';
import PlayIcon from '../icons/play';
import StopIcon from '../icons/stop';
import ReplayIcon from '../icons/replay';
import Parrot from '../icons/parrot';
import { useFavoriteToggle } from './SuggestionCard';
import type { Algset } from '../../composables/recon/SimpleCubeInterpreter';
import { cube3x3, type Move3x3 } from '../../utils/parser/cube3x3';

export interface PlaybackControls {
  playingAlg: string | null;
  isPlaybackFinished: boolean;
  onPlay: (moves: Move3x3[]) => void;
  onStop: () => void;
}

const iconButtonClass = 'shrink-0 text-neutral-500 hover:text-neutral-200 focus-visible:outline-none';

export function CopyAlgButton({ moves, noun }: { moves: Move3x3[]; noun: string }) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = (event: React.MouseEvent) => {
    event.preventDefault();
    navigator.clipboard?.writeText(cube3x3.format(moves)).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1200);
    });
  };

  const copyLabel = copied ? 'Copied' : `Copy ${noun}`;

  return (
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
        aria-label={copyLabel}
        title={copyLabel}
        className={`${iconButtonClass} ${copied ? 'text-primary-400' : ''}`}
        onClick={handleCopy}
      >
        <CopyIcon />
      </button>
    </span>
  );
}

export function PlayAlgButton({ moves, noun, playingAlg, isPlaybackFinished, onPlay, onStop }: { moves: Move3x3[]; noun: string } & PlaybackControls) {
  const alg = cube3x3.format(moves);
  const isShown = playingAlg === alg;
  const isPlaying = isShown && !isPlaybackFinished;
  const isFinished = isShown && isPlaybackFinished;

  const handlePlay = (event: React.MouseEvent) => {
    event.preventDefault();
    if (isPlaying) onStop();
    else onPlay(moves);
  };

  const playbackLabel = `${isPlaying ? 'Stop' : isFinished ? 'Replay' : 'Play'} ${noun}`;

  return (
    <button
      type="button"
      aria-label={playbackLabel}
      title={playbackLabel}
      className={`${iconButtonClass} ${isShown ? 'text-primary-400' : ''}`}
      onClick={handlePlay}
    >
      {isPlaying ? <StopIcon className="translate-x-[0.13em]" /> : isFinished ? <ReplayIcon /> : <PlayIcon />}
    </button>
  );
}

export function FavoriteAlgButton({ moves, algset }: { moves: Move3x3[]; algset?: Algset }) {
  const { favorited, animating, toggle, handleAnimationEnd } = useFavoriteToggle(moves, algset);
  const favoriteLabel = favorited ? 'Unfavorite alg' : 'Favorite alg';

  return (
    <button
      type="button"
      aria-label={favoriteLabel}
      title={favoriteLabel}
      aria-pressed={favorited}
      className={`${iconButtonClass} ${favorited ? 'text-primary-400' : ''}`}
      onClick={toggle}
    >
      <Parrot filled={favorited} animating={animating} onAnimationEnd={handleAnimationEnd} />
    </button>
  );
}
