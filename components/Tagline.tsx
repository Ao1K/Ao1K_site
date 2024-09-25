"use client";
import React, { useState } from 'react';

const Tagline = () => {
  const [hovering, setHovering] = useState<boolean>(false);
  const [displayText, setDisplayText] = useState<string>('statistical');

  const handleMouseEnter = () => {
    setHovering(true);
    let currentIndex = displayText.length;

    const typingInterval = setInterval(() => {
      if (currentIndex > 0) {
        setDisplayText(displayText.slice(0, --currentIndex));
      } else {
        clearInterval(typingInterval);
      }
    }, 100);
  };

  const handleMouseLeave = () => {
    // setHovering(false);
    // setDisplayText('statistical');
  };

  return (
    <div
      className="px-6 py-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      find your {hovering ? displayText : 'statistical'} significance
    </div>
  );
};

export default Tagline;
