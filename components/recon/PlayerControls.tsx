import React from 'react';
import FullLeftIcon from '../icons/fullLeft';
import StepLeftIcon from '../icons/stepLeft';
import PauseIcon from '../icons/pause';
import PlayIcon from '../icons/play';
import ReplayIcon from '../icons/replay';
import StepRightIcon from '../icons/stepRight';
import FullRightIcon from '../icons/fullRight';

interface ControlsPlaceholderProps {
  isVisible: boolean;
  onFullLeft: () => void;
  onStepLeft: () => void;
  onPause: () => void;
  onPlay: () => void;
  onReplay: () => void;
  onStepRight: () => void;
  onFullRight: () => void;
  controllerButtonsStatus: {
    fullLeft: string;
    stepLeft: string;
    playPause: string;
    stepRight: string;
    fullRight: string;
  };
  flashingButtons: Set<string>;
  handleFlash: (buttonId: string) => void;
}

const ControlsPlaceholder: React.FC<ControlsPlaceholderProps> = ({
  isVisible,
  onFullLeft,
  onStepLeft,
  onPause,
  onPlay,
  onReplay,
  onStepRight,
  onFullRight,
  controllerButtonsStatus,
  flashingButtons,
  handleFlash,
}) => {

  if (!isVisible) return null;

  const handleButtonClick = (buttonId: string, action: () => void) => {
    handleFlash(buttonId);
    action();
  };

  const handlePlayPause = () => {
    handleFlash('playPause');
    switch (controllerButtonsStatus.playPause) {
      case 'play':
        onPause();
        break;
      case 'pause':
        onPlay();
        break;
      case 'replay':
        onReplay();
        break;
      default:
        console.warn('Unknown play/pause state:', controllerButtonsStatus.playPause);
        break;
    }
  }

  const getButtonClasses = (status: string, buttonId: string) => {
    const baseClasses = "p-1 border border-neutral-600 bg-dark rounded transition-colors relative group";
    const isFlashing = flashingButtons.has(buttonId);
    
    if (status === 'disabled') {
      return `${baseClasses} pointer-events-none text-neutral-700`;
    }
    return `${baseClasses} hover:bg-neutral-600 ${isFlashing ? 'text-primary-100' : 'text-dark_accent'}`;
  };

  const renderPlayPauseIcon = () => {
    switch (controllerButtonsStatus.playPause) {
      case 'play':
        return <PauseIcon />;
      case 'pause':
        return <PlayIcon />;
      case 'replay':
        return <ReplayIcon />;
      default:
        return <PlayIcon />;
    }
  };

  const getPlayPauseAriaLabel = () => {
    switch (controllerButtonsStatus.playPause) {
      case 'play':
        return 'Pause';
      case 'pause':
        return 'Play';
      case 'replay':
        return 'Replay';
      default:
        return 'Play';
    }
  };

  const getPlayPauseTooltipText = () => {
    switch (controllerButtonsStatus.playPause) {
      case 'play':
        return 'Pause';
      case 'pause':
        return 'Play';
      case 'replay':
        return 'Replay';
      default:
        return 'Play';
    }
  };

  const renderTooltip = (text: string, hotkey: string) => (
    <div className="flex flex-col absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap text-primary-100 bg-black text-sm opacity-0 group-hover:opacity-100 group-hover:delay-100 pointer-events-none select-none px-2 py-1">
      <div>{text}</div>
      <div>({hotkey})</div>
    </div>
  );

  return (
    <div className="absolute bottom-1 left-1 z-30 rounded-sm p-2 flex items-center justify-center space-x-1">
      <button 
        onClick={() => handleButtonClick('fullLeft', onFullLeft)} 
        className={getButtonClasses(controllerButtonsStatus.fullLeft, 'fullLeft')} 
        aria-label="Go to start"
        disabled={controllerButtonsStatus.fullLeft === 'disabled'}
      >
        <FullLeftIcon />
        {renderTooltip('Go to start', '↑')}
      </button>
      <button 
        onClick={() => handleButtonClick('stepLeft', onStepLeft)} 
        className={getButtonClasses(controllerButtonsStatus.stepLeft, 'stepLeft')} 
        aria-label="Step back"
        disabled={controllerButtonsStatus.stepLeft === 'disabled'}
      >
        <StepLeftIcon />
        {renderTooltip('Step back', '←')}
      </button>
      <button 
        onClick={handlePlayPause} 
        className={getButtonClasses(controllerButtonsStatus.playPause, 'playPause')} 
        aria-label={getPlayPauseAriaLabel()}
        disabled={controllerButtonsStatus.playPause === 'disabled'}
      >
        {renderPlayPauseIcon()}
        {renderTooltip(getPlayPauseTooltipText(), 'Space')}
      </button>
      <button 
        onClick={() => handleButtonClick('stepRight', onStepRight)} 
        className={getButtonClasses(controllerButtonsStatus.stepRight, 'stepRight')} 
        aria-label="Step forward"
        disabled={controllerButtonsStatus.stepRight === 'disabled'}
      >
        <StepRightIcon />
        {renderTooltip('Step forward', '→')}
      </button>
      <button 
        onClick={() => handleButtonClick('fullRight', onFullRight)} 
        className={getButtonClasses(controllerButtonsStatus.fullRight, 'fullRight')} 
        aria-label="Go to end"
        disabled={controllerButtonsStatus.fullRight === 'disabled'}
      >
        <FullRightIcon />
        {renderTooltip('Go to end', '↓')}
      </button>
    </div>
  );
};

export default ControlsPlaceholder;
