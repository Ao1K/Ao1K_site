'use client';

// "Your Algs": the user's favorited algs, read from local storage. Each card toggles its
// learning status and can be deleted inline. The list can be filtered by status and sorted
// by when it was added or by move count.

import { useEffect, useMemo, useRef, useState } from 'react';
import Parrot from '../icons/parrot';
import CaretIcon from '../icons/dropdown';
import FunnelIcon from '../icons/funnel';
import SortIcon from '../icons/sort';
import AddIcon from '../icons/plus';
import { useAlgFavorites } from '../../composables/algs/algFavorites';
import { classifyFavorite } from '../../composables/algs/classifyAlg';
import YourAlgCard from './YourAlgCard';
import AddAlgRow from './AddAlgRow';
import DownloadMenu from './DownloadMenu';
import type { AlgStatus } from '../../composables/algs/algFavorites';

const nextStatus = (status: AlgStatus): AlgStatus => {
  switch (status) {
    case 'none': return 'learning'
    case 'learning': return 'learned'
    case 'learned': return 'none'
  }
}

type StatusFilter = AlgStatus | 'all';
type AlgsetFilter = string | 'all';
type SortKey = 'added' | 'moves' | 'alpha';
type SortDir = 'asc' | 'desc';

// statuses in the order they should appear in the filter dropdown
const STATUS_ORDER: AlgStatus[] = ['learning', 'learned', 'none'];
const STATUS_LABEL: Record<AlgStatus, string> = {
  learning: 'Learning',
  learned: 'Memorized',
  none: 'Unmarked',
};

// movecount is the number of spaces plus one (the count of space-separated moves)
const moveCount = (alg: string): number => {
  const trimmed = alg.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
};

// custom dropdown (not a native <select>) so that clicking from one open menu straight to
// another switches in a single click; the open menu is tracked by the parent toolbar
function FilterSelect<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { label, value, options, onChange, open, onToggle, onClose } = props;
  const current = options.find((o) => o.value === value);
  // with only "All" plus a single set there is nothing to choose, so the menu is inert
  const disabled = options.length <= 2;
  return (
    <div className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`appearance-none rounded-sm border bg-dark py-1 pl-2 pr-6 text-sm text-left focus:outline-none ${disabled ? 'border-neutral-700 text-neutral-600 cursor-default' : 'border-neutral-600 text-primary-100 cursor-pointer hover:border-neutral-500 focus:border-neutral-500'}`}
      >
        {current?.label}
      </button>
      <CaretIcon className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 ${disabled ? 'text-neutral-600' : 'text-primary-100'}`} />
      {open && !disabled && (
        <div className="absolute left-0 top-full z-20 min-w-full rounded-sm border border-neutral-600 bg-dark shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); onClose(); }}
              className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-sm hover:bg-neutral-700 transition-colors ${o.value === value ? 'text-primary-300' : 'text-primary-100'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface YourAlgsListProps {
  // the empty-state hint only makes sense when there are suggestions to favorite
  hasSolutions: boolean;
}

const YourAlgsList = ({ hasSolutions }: YourAlgsListProps) => {
  const { favorites, addFavorite, setFavoriteStatus, setFavoriteAlgset, removeFavorite } = useAlgFavorites();

  const [adding, setAdding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [algsetFilter, setAlgsetFilter] = useState<AlgsetFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('added');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // only one toolbar menu is open at a time, so clicking from one straight to another switches
  const [openMenu, setOpenMenu] = useState<null | 'filter' | 'algset' | 'sort' | 'download'>(null);
  const toolbarRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const toggleMenu = (menu: 'filter' | 'algset' | 'sort' | 'download') =>
    setOpenMenu((cur) => (cur === menu ? null : menu));

  // the statuses actually present, cached so a long list isn't rescanned every render;
  // recomputed only when the favorites change (e.g. an alg is added)
  const availableStatuses = useMemo(() => {
    const present = new Set(favorites.map((f) => f.status));
    return STATUS_ORDER.filter((s) => present.has(s));
  }, [favorites]);

  // ignore a filter whose status is no longer present so the list never looks empty from a stale pick
  const effectiveStatus: StatusFilter =
    statusFilter !== 'all' && availableStatuses.includes(statusFilter) ? statusFilter : 'all';

  // the effective algset of each alg is its manual override or the detected classification label;
  // cached so the interpreter isn't re-run on every render (only when the favorites change)
  const algsetByAlg = useMemo(() => {
    const map = new Map<string, string>();
    favorites.forEach((f) => map.set(f.alg, classifyFavorite(f).label));
    return map;
  }, [favorites]);

  // the algsets actually present, sorted so the dropdown order is stable
  const availableAlgsets = useMemo(
    () => [...new Set(algsetByAlg.values())].sort((a, b) => a.localeCompare(b)),
    [algsetByAlg],
  );

  // ignore a filter whose algset is no longer present, mirroring the status fallback
  const effectiveAlgset: AlgsetFilter =
    algsetFilter !== 'all' && availableAlgsets.includes(algsetFilter) ? algsetFilter : 'all';

  const visible = useMemo(() => {
    // filters are AND-based: an alg must pass both the status and algset filters to show
    let filtered = favorites;
    if (effectiveStatus !== 'all') filtered = filtered.filter((f) => f.status === effectiveStatus);
    if (effectiveAlgset !== 'all') filtered = filtered.filter((f) => algsetByAlg.get(f.alg) === effectiveAlgset);
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'added') return sortDir === 'asc' ? filtered : [...filtered].reverse();
    if (sortKey === 'alpha') return [...filtered].sort((a, b) => dir * a.alg.localeCompare(b.alg));
    // stable sort keeps added-order among algs of equal length
    return [...filtered].sort((a, b) => dir * (moveCount(a.alg) - moveCount(b.alg)));
  }, [favorites, effectiveStatus, effectiveAlgset, algsetByAlg, sortKey, sortDir]);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All status' },
    ...availableStatuses.map((s) => ({ value: s as StatusFilter, label: STATUS_LABEL[s] })),
  ];
  const algsetOptions: { value: AlgsetFilter; label: string }[] = [
    { value: 'all', label: 'All sets' },
    ...availableAlgsets.map((s) => ({ value: s, label: s })),
  ];
  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'added', label: 'Date added' },
    { value: 'moves', label: 'Move count' },
    { value: 'alpha', label: 'Alphabetical' },
  ];

  return (
    <div className="border border-neutral-600 rounded-sm p-3 w-full h-fit text-primary-100">
      <h2 ref={toolbarRef} className="relative flex flex-wrap items-start gap-x-3 gap-y-2 px-2 font-medium mb-3 pb-1 text-lg border-b border-neutral-600 -mx-3">
        <div className="flex items-stretch h-8 mb-2">
          <div className="relative">
            <div title="SQUAAAAWK!! Learn spaced repetition! Learn spaced repetition!" className="absolute left-1 -bottom-1.25 text-4xl z-10">🦜</div>
            <div className="w-10 h-0 absolute border-b -bottom-1 left-1 border-neutral-700"></div>
            <div className="w-7 h-0 absolute border-b -bottom-1.75 left-2 border-neutral-700"></div>
          </div>
          <span className='pl-10 self-center'> Your Algs</span>
        </div>
        {favorites.length > 0 && (
          <>
          <div className="flex-1 min-w-50 flex flex-wrap-reverse justify-end gap-x-2 gap-y-1.5 pb-1 text-sm font-normal">
            <div className="flex items-center gap-1.5">
              <FunnelIcon className="shrink-0 text-dark_accent" />
              <FilterSelect
                label="Filter by status"
                value={effectiveStatus}
                options={statusOptions}
                onChange={setStatusFilter}
                open={openMenu === 'filter'}
                onToggle={() => toggleMenu('filter')}
                onClose={() => setOpenMenu(null)}
              />
              {availableAlgsets.length > 0 && (
                <FilterSelect
                  label="Filter by algset"
                  value={effectiveAlgset}
                  options={algsetOptions}
                  onChange={setAlgsetFilter}
                  open={openMenu === 'algset'}
                  onToggle={() => toggleMenu('algset')}
                  onClose={() => setOpenMenu(null)}
                />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); setOpenMenu(null); }}
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                aria-label="Toggle sort direction"
                className="shrink-0 text-dark_accent hover:text-primary-100 transition-colors
                border rounded-sm border-neutral-600 px-1.5 py-0.5 bg-dark flex items-center justify-center"
              >
                <SortIcon className={sortDir === 'desc' ? 'rotate-180' : ''} />
              </button>
              <FilterSelect
                label="Sort by"
                value={sortKey}
                options={sortOptions}
                onChange={setSortKey}
                open={openMenu === 'sort'}
                onToggle={() => toggleMenu('sort')}
                onClose={() => setOpenMenu(null)}
              />
            </div>
            <div className="flex items-center gap-1.5 pl-2 pr-1.5 h-7.5 border rounded-sm border-neutral-600 hover:border-neutral-500 focus:border-neutral-500">
              <DownloadMenu
                favorites={visible}
                open={openMenu === 'download'}
                onToggle={() => toggleMenu('download')}
                onClose={() => setOpenMenu(null)}
              />
            </div>
          </div>
          </>
        )}
      </h2>

      {favorites.length === 0 && hasSolutions && (
        <p className="text-dark_accent text-sm whitespace-nowrap pl-3 pt-2 pb-4">
          <span className="flex flex-wrap gap-1 items-center">Algs that you click the <Parrot className="w-7 h-7" /> for will appear here!</span>
        </p>
      )}

      <div className="mb-2 grid min-h-13 items-center">
        {adding ? (
          <AddAlgRow onAdd={addFavorite} onCancel={() => setAdding(false)} />
        ) : (
          <button type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-3 text-primary-100 hover:text-primary-300 transition-colors
            px-1.5 py-2 bg-dark"
          >
            <AddIcon className="w-5 h-5 ml-1" />
            <span className="text-sm">Add an alg manually</span>
          </button>
        )}
      </div>
      {favorites.length > 0 && (
        <ul className="flex flex-col gap-1">
          {visible.map((fav) => (
            <li key={fav.alg}>
              <YourAlgCard
                alg={fav.alg}
                status={fav.status}
                algset={fav.algset}
                onToggleStatus={() => setFavoriteStatus(fav.alg, nextStatus(fav.status))}
                onSetAlgset={(algset) => setFavoriteAlgset(fav.alg, algset)}
                onDelete={() => removeFavorite(fav.alg)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default YourAlgsList;
