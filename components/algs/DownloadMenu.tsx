'use client';

// Download dropdown for the "Your Algs" list. Offers CSV and PDF exports of whatever cards
// are currently visible; the parent passes the post-filter list straight through.

import DownloadIcon from '../icons/download';
import CaretIcon from '../icons/dropdown';
import type { FavoriteAlg } from '../../composables/algs/algFavorites';
import { useCubeColors } from '../../composables/useSettings';
import { downloadFavoritesCsv, downloadFavoritesPdf } from '../../composables/algs/exportFavorites';

interface DownloadMenuProps {
  favorites: FavoriteAlg[];
  // open state is owned by the parent toolbar so only one menu is open at a time
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const DownloadMenu = ({ favorites, open, onToggle, onClose }: DownloadMenuProps) => {
  const [cubeColors] = useCubeColors();
  const exportCsv = () => { downloadFavoritesCsv(favorites); onClose(); };
  const exportPdf = () => { downloadFavoritesPdf(favorites, cubeColors); onClose(); };

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={onToggle}
        title="Download"
        aria-label="Download visible algs"
        className="flex items-center gap-1 text-primary-100 transition-colors"
      >
        <DownloadIcon />
        <CaretIcon className={`transition-transform duration-300 ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && (
        <div className="absolute -right-1.75 top-full mt-1 z-20 min-w-28 rounded-sm border border-neutral-600 bg-dark shadow-lg">
          <div className="text-primary-100 p-2">Download as...</div>
          <button
            type="button"
            onClick={exportCsv}
            className="block w-full px-3 py-1.5 text-left text-sm text-primary-100 hover:bg-neutral-700 transition-colors"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="block w-full px-3 py-1.5 text-left text-sm text-primary-100 hover:bg-neutral-700 transition-colors"
          >
            PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default DownloadMenu;
