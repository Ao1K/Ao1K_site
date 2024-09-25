import { useState, useRef, useEffect } from 'react';
import InfoIcon from './icons/info';

export default function ReconTimeHelpInfo() {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'center' | 'right'>('right');
  const popupRef = useRef<HTMLDivElement>(null);

  // new perfect idea: clicking/tapping greys sceeen, prevents input till popup closed. Hovering opens and closes popup

  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    const popup = document.getElementById('popup');
    if (popup && !popup.contains(event.target as Node)) {
      popup.style.display = 'none';
    }
  };

  const handlePopupPosition = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const iconRect = event.currentTarget.getBoundingClientRect();
    const popup = document.getElementById('popup');
    
    if (popup) {
      popup.style.display = 'block';

      let top = iconRect.top;
      let left = iconRect.left;
  
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const tooTall = iconRect.bottom + popup.offsetHeight > viewportHeight;
      const tooWide = iconRect.right + popup.offsetWidth > viewportWidth;
  
      if (tooTall || tooWide) {
        top = top - popup.offsetHeight
        left = (viewportWidth - 200) / 2;
      }
      
  
      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;



      setIsVisible(true);
    }
  };
  

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    //document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      //document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <div className="cursor-pointer" onMouseEnter={handlePopupPosition} onTouchStart={handlePopupPosition} onMouseLeave={()=>handleClickOutside}>
        <InfoIcon className="text-dark_accent" />
      </div>
      <div
        id="popup"
        className="fixed bg-white border rounded-lg ml-10 p-4 max-w-[400px] max-h-full overflow-auto hidden"
      >
        <div className=""></div>
          <p className="text-sm text-gray-700">
            <strong>STM</strong> means Slice Turn Metric. It's a way of measuring the number of moves in your solution. <strong> x y </strong> and <strong>z</strong> don't count as moves. Every other letter counts as one move.
          </p>
          <p className="text-sm text-gray-700 mt-2">
            <strong>TPS</strong> means Turns Per Second.
          </p>
        </div>
    </div>
  );
}

// className={`absolute ${position === 'right' ? 'left-full ml-2 mt-4' : 'fixed inset-0 flex items-center justify-center p-4 w-64'}  bg-white border rounded-lg shadow-lg`}