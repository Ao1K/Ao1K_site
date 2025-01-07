import SpeedIcon from './icons/speed';
import DropdownIcon from './icons/dropdown';
import { useState, useEffect } from 'react';

interface SpeedSliderProps {
    speed: number;
    handleSpeedChange: (speed: number) => void;
}

export default function ToolbarButton({speed, handleSpeedChange}: SpeedSliderProps) {
  const [isRotated, setIsRotated] = useState(false);

  const slow = 15;
  const medium = 30;
  const fast = 60;
  const instant = 100;

  const handleClick = () => {
    setIsRotated(!isRotated);
  }

  const setSpeed = (speed: number) => {
    handleSpeedChange(speed);
    setIsRotated(false);
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
    <div id="speed-dropdown" className={`relative inline-block group`}>
      <button
        className="flex flex-col align-middle w-16 h-8 px-2 py-1 rounded-sm hover:bg-primary border border-primary text-light select-none"
        onClick={handleClick}
      >
        <div className="flex justify-center items-center w-full select-none space-x-2">
          <SpeedIcon className="text-light" />
          <DropdownIcon className={`align-middle h-full transition-transform duration-300 ${isRotated ? '' : 'rotate-180'}`}/>
        </div>
      </button>

      <div className={`flex flex-col absolute left-1/2 -translate-x-1/2 items-center text-light bg-dark rounded-sm text-sm opacity-0 group-hover:opacity-100 group-hover:delay-100 pointer-events-none select-none px-2 pb-1`}>
          <div>Speed</div>
      </div>

      {isRotated ? 
        <div className="flex flex-col bg-dark absolute -translate-x-[4px] place-items-start text-light px-1 pb-1 text-sm">
          <button className={`hover:bg-primary py-1 border border-primary ${speed === slow ? 'bg-primary' : null } w-16`} onClick={() => setSpeed(slow)}>Slow</button>
          <button className={`hover:bg-primary py-1 border border-primary ${speed === medium ? 'bg-primary' : null } w-16`} onClick={() => setSpeed(medium)}>Medium</button>
          <button className={`hover:bg-primary py-1 border border-primary ${speed === fast ? 'bg-primary' : null } w-16`} onClick={() => setSpeed(fast)}>Fast</button>
          <button className={`hover:bg-primary py-1 border border-primary ${speed === instant ? 'bg-primary' : null } w-16`} onClick={() => setSpeed(instant)}>Instant</button>
        </div>
      : null }
    </div>
  );
}
