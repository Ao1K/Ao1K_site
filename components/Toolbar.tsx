import { useEffect, useRef, useState } from 'react';
import ToolbarButton, { ButtonProps } from './ToolbarButton';

interface ButtonRowProps {
  buttons: ButtonProps[];
  containerRef: React.RefObject<HTMLDivElement>;
}

const ResponsiveButtonRow = ({ buttons, containerRef }: ButtonRowProps) => {
  const [visibleButtons, setVisibleButtons] = useState(buttons);
  const [overflowButtons, setOverflowButtons] = useState<ButtonProps[]>([]);
  const [overflowBtnVisibility, setOverflowBtnVisibility] = useState<boolean>(false);

  const MIN_MORE_TOOLS_WIDTH = 100; // pixels

  const adjustButtons = () => {
    const container = containerRef.current;
    if (!container) return;

    let totalWidth = 0;
    let regButtonWidth = 40; // assumed width of a button
    let visible: ButtonProps[] = [];
    let overflow: ButtonProps[] = [];
    let moreToolsBtnWidth = document.querySelector('#moreToolsBtn')?.clientWidth || MIN_MORE_TOOLS_WIDTH; // default needed for initial render
    let speedDropdownWidth = 68; 

    let isCollapsing = false;

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const remainingButtons = buttons.length - i;
      const buttonWidth = container.querySelector(`#${button.id}`)?.clientWidth || 40;
      totalWidth = totalWidth + buttonWidth + 8;
      //console.log('totalWidth', totalWidth)


      const isSubstantialCollapse = remainingButtons >= 3;
      // console.log('isSubstantialCollapse', isSubstantialCollapse)
      // console.log('isCollapsing', isCollapsing)
      // console.log(totalWidth + moreToolsBtnWidth + speedDropdownWidth, container.clientWidth)

      if (((totalWidth + moreToolsBtnWidth + speedDropdownWidth + 20) > (container.clientWidth )) && (isSubstantialCollapse || isCollapsing)) {
        overflow.push(button);
        isCollapsing = true;
      } else {
        visible.push(button);
      }
    }

    setVisibleButtons(visible);
    setOverflowButtons(overflow);
  };

  const toggleOverflowBtnVisibility = () => {
    setOverflowBtnVisibility(!overflowBtnVisibility);
  }

  const moreToolsRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (moreToolsRef.current && !moreToolsRef.current.contains(event.target as Node)) {
      setOverflowBtnVisibility(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => adjustButtons());
    containerRef.current && resizeObserver.observe(containerRef.current); // this observe() is probably inadequate
    adjustButtons(); // Initial adjustment
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className={`flex flex-row flex-nowrap relative space-x-1 min-w-${MIN_MORE_TOOLS_WIDTH}`} ref={containerRef}>

      {visibleButtons.map(button => (
        <ToolbarButton key={button.id} {...button} />
      ))}

      {overflowButtons.length > 0 && (
        <div className="relative" ref={moreToolsRef}>
          <button
            id="moreToolsBtn"
            className="flex flex-row align-middle whitespace-nowrap h-8 px-2 py-1 rounded-sm hover:bg-neutral-600 border border-neutral-600 text-primary-100 select-none" 
            onClick={toggleOverflowBtnVisibility}>
              More Tools
          </button>
          
          {overflowBtnVisibility && (
            <div className="flex flex-col absolute right-0 -space-y-1 bg-primary-900 shadow-lg border border-gray-200 px-1 rounded-md z-50">
              {overflowButtons.map(button => (
                <ToolbarButton key={button.id} {...button} isOverflow={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponsiveButtonRow;
