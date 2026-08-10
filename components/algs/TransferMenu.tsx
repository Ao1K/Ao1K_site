'use client';

// Import/export dropdown for the "Your Algs" list. Exports as CSV or PDF, scoped by a segmented
// All/Filtered control, and imports algs from a CSV via a hidden file input; the parsed rows go
// back to the parent to merge and report.

import { useState, useRef } from 'react';
import DownloadIcon from '../icons/download';
import UploadIcon from '../icons/upload';
import CaretIcon from '../icons/dropdown';
import type { FavoriteAlg } from '../../composables/algs/algFavorites';
import { useCubeColors } from '../../composables/useSettings';
import { downloadFavoritesCsv, downloadFavoritesPdf } from '../../composables/algs/exportFavorites';
import { parseFavoritesCsv, type ParsedImport } from '../../composables/algs/importFavorites';

interface TransferMenuProps {
  favorites: FavoriteAlg[];
  filtered: FavoriteAlg[];
  onImport: (parsed: ParsedImport) => void;
  onImportError: () => void;
  // open state is owned by the parent toolbar so only one menu is open at a time
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const TransferMenu = ({ favorites, filtered, onImport, onImportError, open, onToggle, onClose }: TransferMenuProps) => {
  const [cubeColors] = useCubeColors();
  const [filteredOnly, setFilteredOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const exported = filteredOnly ? filtered : favorites;
  const nothingToExport = exported.length === 0;
  const exportCsv = () => { downloadFavoritesCsv(exported); onClose(); };
  const exportPdf = () => { downloadFavoritesPdf(exported, cubeColors); onClose(); };

  const scopeOptions = [
    { value: false, label: 'All', count: favorites.length },
    { value: true, label: 'Filtered', count: filtered.length },
  ];

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // clear the input so picking the same file again still fires a change
    event.target.value = '';
    if (!file) return;
    try {
      onImport(parseFavoritesCsv(await file.text()));
    } catch {
      onImportError();
    }
  };

  // items indent past the category icon so their labels line up with the category name
  const itemClass = 'block w-full pl-9 pr-3 py-1.5 text-left text-sm text-primary-100 hover:bg-neutral-700 transition-colors';
  const disabledItemClass = 'block w-full pl-9 pr-3 py-1.5 text-left text-sm text-neutral-600 cursor-default';
  const categoryClass = 'flex items-center gap-2 px-3 text-sm tracking-wide text-dark_accent';

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 pl-2 pr-1.5 h-7.5 border rounded-sm bg-dark border-neutral-600 text-sm text-primary-100 cursor-pointer transition-colors hover:border-neutral-500 focus:border-neutral-500 focus:outline-none"
      >
        <span className="whitespace-nowrap">Import/Export</span>
        <CaretIcon className={`transition-transform duration-300 ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 min-w-45 rounded-sm border border-neutral-600 bg-dark shadow-lg">
          <div className={`${categoryClass} py-1.5`}>
            <UploadIcon className="w-4 h-4 shrink-0" />
            Import from
          </div>
          <button type="button" onClick={() => { inputRef.current?.click(); onClose(); }} className={itemClass}>
            CSV
          </button>
          <div className={`${categoryClass} border-t border-neutral-600 pb-1.5 pt-2`}>
            <DownloadIcon className="w-4 h-4 shrink-0" />
            Export...
          </div>
          <div role="group" aria-label="Which algs to export" className="flex mx-3 mb-1.5 rounded-sm border border-neutral-600 overflow-hidden">
            {scopeOptions.map(({ value, label, count }) => (
              <button
                key={label}
                type="button"
                aria-pressed={filteredOnly === value}
                onClick={() => setFilteredOnly(value)}
                className={`flex-1 px-2 py-1 text-xs whitespace-nowrap transition-colors ${
                  filteredOnly === value
                    ? 'bg-neutral-600 text-primary-100'
                    : 'text-primary-100 hover:bg-neutral-700'
                }`}
              >
                {label} <span className="tabular-nums">{count}</span>
              </button>
            ))}
          </div>
          <div className={`${categoryClass} pb-1.5`}>
            <span className="w-4 shrink-0" />
            as
          </div>
          <button type="button" onClick={exportCsv} disabled={nothingToExport} className={nothingToExport ? disabledItemClass : itemClass}>
            CSV
          </button>
          <button type="button" onClick={exportPdf} disabled={nothingToExport} className={nothingToExport ? disabledItemClass : itemClass}>
            PDF
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
};

export default TransferMenu;
