import CopyIcon from '../icons/copy';
import CameraIcon from '../icons/camera';
import DropdownIcon from '../icons/dropdown';
import TextTIcon from "../icons/text-T";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface CopySolveDropdownProps {
  onCopyText: () => void;
  onScreenshot: () => void;
  alert: [string, string];
  setAlert: React.Dispatch<React.SetStateAction<[string, string]>>;
}

export default function CopySolveDropdown({ onCopyText, onScreenshot, alert, setAlert }: CopySolveDropdownProps) {
  const [isRotated, setIsRotated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsRotated(!isRotated);
  }

  const handleCopyText = () => {
    onCopyText();
    setIsRotated(false);
  }

  const handleScreenshot = () => {
    setIsLoading(true);
    onScreenshot();
    setIsRotated(false);
  }

  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    const popup = document.getElementById('copy-solve-dropdown');
    if (popup && !popup.contains(event.target as Node)) {
      setIsRotated(false);
    }
  };

  useEffect(() => {
    if (alert && alert[0] === 'copy-solve' && alert[1] && setAlert) {
      // When alert appears, screenshot is done, so stop loading
      setIsLoading(false);
      
      const timeoutId = setTimeout(() => {
        setAlert(['', '']); // do not ever set to a truthy value
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [alert, setAlert]);

  useEffect(() => {
    document.addEventListener('scroll', () => {
      setIsRotated(false);
    });
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('scroll', () => {});
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  return (
    <div id="copy-solve-dropdown" className="relative inline-block group z-30">
      {isLoading && 
        <div className="py-1 px-2 -translate-y-[120%] absolute left-1/2 -translate-x-1/2 rounded-sm pointer-events-none select-none z-50 mb-2 whitespace-nowrap">
          <Image src="/LoadingSpinner.webp" alt="Loading..." width={32} height={32} className="" />
        </div>
      }
      {alert[0] === 'copy-solve' && !isLoading &&
        <div className="py-1 px-2 font-semibold -translate-y-[120%] absolute left-1/2 -translate-x-1/2 text-dark bg-primary-100 rounded-sm text-sm pointer-events-none select-none z-50 mb-2 whitespace-nowrap">
          {alert[1]}
        </div>
      }
      <button
        className="flex flex-col align-middle w-16 h-8 px-2 py-1 rounded-sm hover:bg-neutral-600 border border-neutral-600 text-dark_accent select-none"
        onClick={handleClick}
      >
        <div className="flex justify-center items-center w-full select-none space-x-2">
          <CopyIcon className="text-dark_accent" />
          <DropdownIcon className={`align-middle h-full transition-transform duration-300 ${isRotated ? 'rotate-180' : ''}`}/>
        </div>
      </button>

      <div className={`flex flex-col absolute left-1/2 -translate-x-1/2 items-center text-primary-100 bg-primary-900 rounded-sm text-sm opacity-0 group-hover:opacity-100 group-hover:delay-100 pointer-events-none select-none px-2 pb-1`}>
        <div>Copy Solve</div>
      </div>

      {isRotated ? 
        <div className="flex flex-col bg-primary-900 absolute -translate-x-[4px] place-items-start text-dark_accent px-1 pb-1 text-sm">
          <button 
            className="hover:bg-neutral-600 py-1 px-2 border border-neutral-600 w-full text-left flex items-center space-x-2" 
            onClick={handleScreenshot}
          >
            <CameraIcon className="w-4 h-4" />
            <span>Screenshot</span>
          </button>
          <button 
            className="hover:bg-neutral-600 py-1 px-2 border border-neutral-600 w-full text-left flex items-center space-x-2" 
            onClick={handleCopyText}
          >
            <TextTIcon className="w-4 h-4" />
            <span>Copy Text</span>
          </button>
        </div>
      : null }
    </div>
  );
}
