import SpeedIcon from '../icons/speed';
import DropdownIcon from '../icons/dropdown';
import { useState, useEffect } from 'react';

interface SpeedSliderProps {
    speed: number;
    setSpeed: (speed: number) => void;
}

export default function ToolbarButton({speed, setSpeed}: SpeedSliderProps) {
  const [isRotated, setIsRotated] = useState(false);

  const slow = 15;
  const medium = 30;
  const fast = 60;
  const instant = 100;

  const handleClick = () => {
    setIsRotated(!isRotated);
  }

  const handleSpeedChange = (speed: number) => {
    setSpeed(speed);

    // hysteresis so user can visually register the change
    setTimeout(() => {
      setIsRotated(false);
    }, 150);
  }

  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    const popup = document.getElementById('speed-dropdown');
    if (popup && !popup.contains(event.target as Node)) {
      setIsRotated(false);
    }
  };

  useEffect(() => {
    document.addEventListener('scroll', (e) => {
      setIsRotated(false);
    });
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('scroll', () => {});
      document.removeEventListener('mousedown', handleClickOutside);
    }

  },[]);

  return (
    <div id="speed-dropdown" className={`relative inline-block group z-30`}>
      <button
        className="flex flex-col align-middle w-16 h-8 px-2 py-1 rounded-sm hover:bg-neutral-600 border border-neutral-600 text-primary-100 select-none"
        onClick={handleClick}
      >
        <div className="flex justify-center items-center w-full select-none space-x-2">
          <SpeedIcon className="text-primary-100" />
          <DropdownIcon className={`align-middle h-full transition-transform duration-300 ${isRotated ? 'rotate-180' : ''}`}/>
        </div>
      </button>

      <div className={`flex flex-col absolute left-1/2 -translate-x-1/2 items-center text-primary-100 bg-primary-900 rounded-sm text-sm opacity-0 group-hover:opacity-100 group-hover:delay-100 pointer-events-none select-none px-2 pb-1`}>
          <div>Speed</div>
      </div>

      {isRotated ? 
        <div className="flex flex-col bg-primary-900 absolute -translate-x-[4px] place-items-start text-primary-100 px-1 pb-1 text-sm">
          <button className={`hover:bg-neutral-600 py-1 border border-neutral-600 ${speed === slow ? 'bg-neutral-600 pointer-events-none' : null } w-16`} onClick={() => handleSpeedChange(slow)}>Slow</button>
          <button className={`hover:bg-neutral-600 py-1 border border-neutral-600 ${speed === medium ? 'bg-neutral-600 pointer-events-none' : null } w-16`} onClick={() => handleSpeedChange(medium)}>Medium</button>
          <button className={`hover:bg-neutral-600 py-1 border border-neutral-600 ${speed === fast ? 'bg-neutral-600 pointer-events-none' : null } w-16`} onClick={() => handleSpeedChange(fast)}>Fast</button>
          <button className={`hover:bg-neutral-600 py-1 border border-neutral-600 ${speed === instant ? 'bg-neutral-600 pointer-events-none' : null } w-16`} onClick={() => handleSpeedChange(instant)}>Instant</button>
        </div>
      : null }
    </div>
  );
}
