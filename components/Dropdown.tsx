import React, { useState, useEffect, FunctionComponent } from 'react';
import DropdownIcon from './icons/dropdown';

interface DropdownProps {
  targetDiv: string;
}

const DropdownButton: FunctionComponent<DropdownProps> = ({targetDiv}) => {
  const [isRotated, setIsRotated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const capitalizeTargetDiv = (targetDiv: string) => {
    return targetDiv.charAt(0).toUpperCase() + targetDiv.slice(1);
  };

  const toggleVisibility = (divName: string) => {
    const targetDiv = document.getElementById(divName);
    targetDiv!.classList.toggle('hidden');
    setIsRotated((prev) => !prev);
    setIsVisible((prev) => !prev);
  };

  const handleResize = () => {
    if (window.innerWidth >= 768) { // md breakpoint
      setIsVisible(true); // Reset to the desired state
      //setIsRotated(false); // Reset rotation if needed
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className="text-dark_accent hover:text-light font-medium mr-1 flex flex-row items-center cursor-pointer select-none"
      onClick={() => toggleVisibility(targetDiv)}
    >
      <DropdownIcon
        className={`align-middle h-full transition-transform w-[2rem] duration-300 ${isRotated ? 'rotate-180' : ''}`}
      />
      <div className="text-dark_accent text-xl pl-1 font-medium py-2">{capitalizeTargetDiv(targetDiv)}</div>
    </div>
  );
};

export default DropdownButton;
