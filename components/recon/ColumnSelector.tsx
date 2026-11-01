import { useEffect, useRef, useState } from 'react';
import PhColumns from '../icons/columns';

interface ColumnSelectorProps {
  showIcons: boolean;
  onShowIconsChange: (value: boolean) => void;
  showSplits: boolean;
  onShowSplitsChange: (value: boolean) => void;
}

export default function ColumnSelector({ showIcons, onShowIconsChange, showSplits, onShowSplitsChange }: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  const columnOptions = [
    { label: 'Icons', isShown: showIcons, onChange: onShowIconsChange },
    { label: 'Splits', isShown: showSplits, onChange: onShowSplitsChange },
  ];

  return (
    <div ref={containerRef} className="relative flex">
      <button
        type="button"
        title="Columns"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center px-1.5 border border-l-0 border-b-0 border-neutral-600 rounded-tr-sm transition-colors duration-150 hover:bg-primary-700 ${isOpen ? 'bg-primary-700 text-primary-100' : 'text-primary-200'}`}
      >
        <PhColumns className="w-5 h-5" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 flex flex-col border border-neutral-600 bg-primary-900 text-sm text-primary-100 whitespace-nowrap">
          {columnOptions.map(({ label, isShown, onChange }) => (
            <label key={label} className="flex items-center justify-between gap-4 px-3 py-1.5 cursor-pointer select-none">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={isShown}
                onChange={() => onChange(!isShown)}
                className="w-4 h-4 cursor-pointer"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
