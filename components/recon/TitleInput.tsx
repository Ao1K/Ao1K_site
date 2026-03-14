import React, { useEffect, useRef, useState } from 'react';
import { titlePlaceholders } from '../../utils/titlePlaceholders';

interface InputWithPlaceholderProps {
  solveTitle: string;
  handleTitleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputWithPlaceholder: React.FC<InputWithPlaceholderProps> = ({ solveTitle, handleTitleChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeholderText, setPlaceholderText] = useState("");
  const lastWidth = useRef(inputRef.current?.clientWidth);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const checkPlaceholderFit = () => {

      if (!inputRef.current) return;
      
      const placeholder = titlePlaceholders[Math.floor(Math.random() * titlePlaceholders.length)];

      const inputWidth = inputRef.current.clientWidth;
      const font = window.getComputedStyle(inputRef.current).font;
      
      if (!canvasContextRef.current) {
        const canvas = document.createElement('canvas');
        canvasContextRef.current = canvas.getContext('2d');
      }
      const context = canvasContextRef.current;

      if (context) {
        context.font = font;
        const textWidth = context.measureText(placeholder).width;
        const fits = textWidth + 10 <= inputWidth;
        setPlaceholderText(fits ? placeholder : '');
        if (fits && placeholder === "Remove the title. It's cleaner.") {
          const label = document.getElementById('title-label');
          if (label) {
            label.style.cursor = 'pointer';
            label.onmouseenter = () => label.style.textDecoration = 'line-through';
            label.onmouseleave = () => label.style.textDecoration = '';
            label.onclick = () => {
              const el = document.getElementById('title-area');
              if (el) el.style.display = 'none';
            };
          }
        }
      }
    };

    const handleResize = () => { // probably unnecessary
      if (lastWidth.current === inputRef.current?.clientWidth) return;
      lastWidth.current = inputRef.current?.clientWidth;
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkPlaceholderFit, 200);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div id="title-area" className="flex flex-grow flex-nowrap items-center text-center min-w-[200px]">
      <div id="title-label" className="text-dark_accent text-xl font-medium select-none">Title</div>
      <input
        id="title-input"
        ref={inputRef}
        placeholder={placeholderText}
        className="p-2 ml-4 w-full text-lg text-primary-100 bg-primary-900 hover:bg-primary-800 border border-neutral-600 focus:border-primary-100 rounded-sm"
        value={solveTitle}
        onChange={handleTitleChange}
        autoComplete="off"
      />
    </div>
  );
};

export default InputWithPlaceholder;
