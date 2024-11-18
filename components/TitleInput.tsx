import React, { useEffect, useRef, useState } from 'react';
import { titlePlaceholders } from '../utils/titlePlaceholders';

interface InputWithPlaceholderProps {
  solveTitle: string;
  handleTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputWithPlaceholder: React.FC<InputWithPlaceholderProps> = ({ solveTitle, handleTitleChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeholderText, setPlaceholderText] = useState("");

  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const checkPlaceholderFit = () => {

      if (!inputRef.current) return;
      
      const placeholder = titlePlaceholders[Math.floor(Math.random() * titlePlaceholders.length)];

      const inputWidth = inputRef.current.clientWidth;
      const font = window.getComputedStyle(inputRef.current).font;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (context) {
        context.font = font;
        const textWidth = context.measureText(placeholder).width;
        setPlaceholderText(textWidth + 10 > inputWidth ? '' : placeholder);
      }
    };

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkPlaceholderFit, 200); // Adjust delay as needed
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <input
      ref={inputRef}
      placeholder={placeholderText}
      className="p-2 ml-4 w-full text-lg text-light bg-dark border-primary focus:border-light border border-1 rounded-sm auto"
      value={solveTitle}
      onChange={handleTitleChange}
      autoComplete="off"
    />
  );
};

export default InputWithPlaceholder;
