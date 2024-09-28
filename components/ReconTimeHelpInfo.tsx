import { useEffect } from 'react';
import InfoIcon from './icons/info';
import CloseIcon from './icons/close';

const WIDTH = 300; //px

export default function ReconTimeHelpInfo() {
  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    const popup = document.getElementById('popup');
    if (popup && !popup.contains(event.target as Node)) {
      popup.style.display = 'none';
    }
  };

  const handleClose = () => {
    const popup = document.getElementById('popup');
    if (popup) {
      popup.style.display = 'none';
    }
  };

  //todo: ideally, width and height of popup should be determined right away, and then top and left set accordingly.
  const handlePopupPosition = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const iconRect = event.currentTarget.getBoundingClientRect();
    const popup = document.getElementById('popup');
    
    if (popup) {
      popup.style.display = 'block';
      let top = iconRect.top;
      let left = iconRect.left;

      //initialize
      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;

  
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const tooTall = iconRect.bottom + popup.offsetHeight > viewportHeight;
      const tooWide = iconRect.right + popup.offsetWidth > viewportWidth;
  
      
      if (tooTall && tooWide) {
        //place on center of screen
        top = viewportHeight / 2;
        
        left = (viewportWidth - WIDTH) / 2;
        
      } else if (tooTall) {
        top = iconRect.top - popup.offsetHeight - 10;
        
      } else if (tooWide) {
        left = viewportWidth/2 - popup.offsetWidth/2;
      }
      
      if (top < 0) { top = 0; }
      if (left < 0) { left = 0; }
      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;
    }
  };
  

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleClose);
    };
  }, []);

  return (
    <div className="relative">
      <div className="cursor-pointer" onClick={handlePopupPosition} onTouchStart={handlePopupPosition} onTouchEnd={handleClose}>
        <InfoIcon className="text-dark_accent" />
      </div>
      <div
        id="popup"
        className={`fixed bg-white border rounded-lg ml-10 p-4 pt-8 max-h-full overflow-auto hidden z-10`}
        style={{ width: `${WIDTH}px` }}
        >
        <button onClick={handleClose} className="absolute top-2 right-2">
          <CloseIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
        </button>

        <p className="text-sm text-gray-700">
          <strong>STM</strong> means Slice Turn Metric. It's a way of measuring the number of moves in your solution. <strong> x y </strong> and <strong>z</strong> don't count as moves. Every other letter counts as one move.
        </p>
        <p className="text-sm text-gray-700 mt-2">
          <strong>TPS</strong> means Turns Per Second. Here, turns are measured in STM.
        </p>
      </div>
    </div>
  );
}