"use client";
import React, { useState } from 'react';

const Tagline = () => {
  const [finished, setFinished] = useState<boolean>(false);
  const [hovering, setHovering] = useState<boolean>(false);
  const [displayText, setDisplayText] = useState<string>('statistical');

  const handleMouseEnter = () => {
    setHovering(true);
    if (finished) return;
    let currentIndex = displayText.length;
    
    startUntyping(currentIndex);
    setFinished(true);
  };

  const startUntyping = (i: number) => {
    const typingInterval = setInterval(() => {
      setDisplayText('statistical|');
      if (i > 0) {
        setDisplayText(displayText.slice(0, --i)+'|');
      } else {
        setDisplayText('');
        clearInterval(typingInterval);

      }
    }, 150);
  }

  return (
    <div
      className={`hover:text-light`}
      onMouseEnter={handleMouseEnter}
    >
      find your {hovering ? displayText : 'statistical'} significance
    </div>
  );
};

export default Tagline;
