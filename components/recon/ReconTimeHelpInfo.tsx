'use client';

import { useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';

import InfoIcon from '../icons/info';

// width of popup
const WIDTH = 300; 

export default function ReconTimeHelpInfo() {
  
  const popupRef_wide = useRef<HTMLDivElement>(null)
  const popupRef_narrow = useRef<HTMLDivElement>(null)

  const [isWideWindow, setIsWideWindow] = useState(true);

  // new ref to disable handleClose for 100ms after handleOpen is triggered
  const openTriggeredRef = useRef(false);

  const WIDTH_THRESHOLD = 600;

  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    const popup1 = popupRef_wide.current;
    if (popup1 && !popup1.contains(event.target as Node)) {
      popup1.style.display = 'none';
    }

    const popup2 = popupRef_narrow.current
    if (popup2 && !popup2.contains(event.target as Node)) {
      popup2.style.display = 'none';
    }
  };

  const handleClose = () => {
    // Prevent handleClose if handleOpen has just triggered
    if (openTriggeredRef.current) return;
    if (popupRef_wide.current) popupRef_wide.current.style.display = 'none';
    if (popupRef_narrow.current) popupRef_narrow.current.style.display = 'none';
  };

  //todo: ideally, width and height of popup should be determined right away, and then top and left set accordingly.
  const handlePopupPosition = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const iconRect = event.currentTarget.getBoundingClientRect();

    // reset popup states
    handleClose();

    const popup = popupRef_wide.current;
    
    if (popup) {
      popup.style.display = 'block';
      let top = iconRect.top;
      let left = iconRect.left;

      //initialize
      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;

      const height = popup.offsetHeight;

      const tooTall = top + height > window.innerHeight;

      if (tooTall) {
        top = window.innerHeight - height;
        popup.style.top = `${top}px`;
      }
    }
  };

  const handleOpen = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // Mark handleOpen trigger to disable handleClose temporarily
    openTriggeredRef.current = true;
    setTimeout(() => {
      openTriggeredRef.current = false;
    }, 700);

    const iconRect = event.currentTarget.getBoundingClientRect();
    const tooWide = iconRect.right + WIDTH > window.innerWidth;


    if (isWideWindow && !tooWide) {
      handlePopupPosition(event);
    } else {
      if (popupRef_narrow.current) {
        popupRef_narrow.current.style.display = 'flex';
      }
    }
  }

  const handleScroll = debounce(() => {
    const currentIsWide = window.innerWidth > WIDTH_THRESHOLD; // compute current state
    if (currentIsWide) handleClose();
  }, 200, { leading: true, trailing: false });
  

  useEffect(() => {
    const updateIsWide = debounce(() => {
      handleClose();
      popupRef_wide.current?.style.removeProperty('display');
      popupRef_narrow.current?.style.removeProperty('display');

      // remove top and left properties
      // popupRef_wide.current?.style.removeProperty('top');
      // popupRef_wide.current?.style.removeProperty('left');
      popupRef_narrow.current?.style.removeProperty('top');
      popupRef_narrow.current?.style.removeProperty('left');

      setIsWideWindow(window.innerWidth > WIDTH_THRESHOLD);
    }, 200, { leading: true, trailing: false });

    updateIsWide();

    window.addEventListener('resize', updateIsWide);
    window.addEventListener('load', updateIsWide);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', updateIsWide);
      window.removeEventListener('load', updateIsWide);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll);

    };
  }, []);

  return (
    <div className="">
      <div className="cursor-pointer" onClick={handleOpen} onTouchStart={handleOpen} onTouchEnd={handleClose}>
        <InfoIcon className="text-dark_accent" />
      </div>

      {/* Always render wide popup */}
      <div
        ref={popupRef_wide}
        className={`fixed hidden bg-white border rounded-lg ml-10 p-4 max-h-full overflow-auto text-wrap z-40`}
        style={{ width: `${WIDTH}px`, display: 'none' }} // default hidden
      >
        <p className="text-sm text-gray-700">
          <strong>STM</strong> means Slice Turn Metric. It&apos;s a way of measuring the number of moves in your solution. <strong> x y </strong> and <strong>z</strong> don&apos;t count as moves. Every other letter counts as one move.
        </p>
        <p className="text-sm text-gray-700 mt-2">
          <strong>TPS</strong> means Turns Per Second. Here, turns are measured in STM.
        </p>
      </div>

      {/* Always render narrow popup */}
      <div
        className="fixed hidden z-40 inset-0 h-screen items-center justify-center bg-neutral-400 bg-opacity-30"
        ref={popupRef_narrow}
        onClick={handleClose}
        style={{ display: 'none' }} // default hidden
      >
        <div 
          className="bg-white p-4 pt-10 rounded-lg shadow-lg max-w-[400px] absolute w-[90%] text-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-1 right-2 py-1 px-3 text-2xl cursor-pointer" onClick={handleClose}>&times;</div>
          <p className="text-sm text-gray-700">
          <strong>STM</strong> means Slice Turn Metric. It&apos;s a way of measuring the number of moves in your solution. <strong> x y </strong> and <strong>z</strong> don&apos;t count as moves. Every other letter counts as one move.
          </p>
          <p className="text-sm text-gray-700 mt-2">
            <strong>TPS</strong> means Turns Per Second. Here, turns are measured in STM.
          </p>
        </div>
      </div>
    </div>
  );
}