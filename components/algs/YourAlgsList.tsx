'use client';

// "Your Algs": the user's favorited algs, read from local storage. Each card toggles its
// learning status and can be deleted inline. The list can be filtered by status and sorted
// by when it was added or by move count.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Parrot from '../icons/parrot';
import CaretIcon from '../icons/dropdown';
import FunnelIcon from '../icons/funnel';
import SortIcon from '../icons/sort';
import AddIcon from '../icons/plus';
import { useAlgFavorites } from '../../composables/algs/algFavorites';
import { showToast } from '../../composables/toast';
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
type ActiveEditor = { kind: 'add' } | { kind: 'card'; alg: string } | null;

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

// statuses in the order they should appear in the filter dropdown
const STATUS_ORDER: AlgStatus[] = ['learning', 'learned', 'none'];
const STATUS_LABEL: Record<AlgStatus, string> = {
  learning: 'Learning',
  learned: 'Memorized',
  none: 'Unlearned',
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
      <CaretIcon className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 transition-transform duration-300 ${open && !disabled ? '' : 'rotate-180'} ${disabled ? 'text-neutral-600' : 'text-primary-100'}`} />
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

function NavBtn(props: { onClick: () => void; disabled: boolean; label: string; children: ReactNode }) {
  const { onClick, disabled, label, children } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-sm border px-1.5 h-7.5 transition-colors ${disabled ? 'border-neutral-700 text-neutral-600 cursor-default' : 'border-neutral-600 bg-dark text-primary-100 cursor-pointer hover:border-neutral-500'}`}
    >
      {children}
    </button>
  );
}

interface YourAlgsListProps {
  // the empty-state hint only makes sense when there are suggestions to favorite
  hasSolutions: boolean;
}

const YourAlgsList = ({ hasSolutions }: YourAlgsListProps) => {
  const { favorites, addFavorite, setFavoriteStatus, setFavoriteAlgset, setFavoriteAlg, removeFavorite } = useAlgFavorites();

  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [confirmingAlg, setConfirmingAlg] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [algsetFilter, setAlgsetFilter] = useState<AlgsetFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('added');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // only one toolbar menu is open at a time, so clicking from one straight to another switches
  const [openMenu, setOpenMenu] = useState<null | 'filter' | 'algset' | 'sort' | 'download' | 'perPage'>(null);
  const toolbarRef = useRef<HTMLHeadingElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const inside = toolbarRef.current?.contains(target) || paginationRef.current?.contains(target);
      if (!inside) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const toggleMenu = (menu: 'filter' | 'algset' | 'sort' | 'download' | 'perPage') =>
    setOpenMenu((cur) => (cur === menu ? null : menu));

  const handleAdd = (alg: string) => {
    if (addFavorite(alg)) return true;
    showToast({
      addMethod: 'replace',
      closable: false,
      icon: <Parrot filled className="w-6 h-6 text-primary-800" />,
      message: <span>{alg} is already in Your Algs</span>,
    });
    return false;
  };

  const handleSetAlg = (alg: string, nextAlg: string) => {
    if (!setFavoriteAlg(alg, nextAlg)) return;
    showToast({
      addMethod: 'replace',
      icon: <Parrot filled className="w-6 h-6 text-primary-800" />,
      message: <span>{nextAlg} was added previously. The old entry was replaced.</span>,
    });
  };

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
    favorites.forEach((f) => map.set(f.alg, classifyFavorite(f).group));
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
  const perPageOptions = PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }));

  // clamp on read so a shrinking list (from a filter or a delete) never strands us past the end,
  // without an effect to chase the state back into range
  const totalPages = Math.max(1, Math.ceil(visible.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const pageItems = visible.slice(pageStart, pageStart + perPage);
  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <>
    <div className="flex items-stretch h-8 mb-0.75 text-dark_accent font-medium text-xl">
      <div className="relative">
        <div id="Algae" title="SQUAAAAWK!! Learn spaced repetition! Learn spaced repetition!" className="absolute left-1 -bottom-1.25 text-4xl z-10">🦜</div>
      </div>
      <span className='pl-12 self-center'> Your Algs</span>
    </div>
    <div className="border border-neutral-600 rounded-sm p-2 w-full h-fit text-primary-100">
      <h2 ref={toolbarRef} className="relative flex flex-wrap items-start gap-x-3 gap-y-2 px-2 font-medium mb-3 pb-1 text-lg border-b border-neutral-600 -mx-2">
        {favorites.length > 0 && (
          <>
          <div className="flex-1 min-w-50 flex flex-wrap-reverse justify-between gap-x-2 gap-y-1.5 pb-1 text-sm font-normal">
            <div className="flex items-center gap-1.5 bg-neutral-700 p-1 rounded-sm">
              <FunnelIcon className="shrink-0 text-dark_accent -mr-1" />
              <FilterSelect
                label="Filter by status"
                value={effectiveStatus}
                options={statusOptions}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                open={openMenu === 'filter'}
                onToggle={() => toggleMenu('filter')}
                onClose={() => setOpenMenu(null)}
              />
              {availableAlgsets.length > 0 && (
                <FilterSelect
                  label="Filter by algset"
                  value={effectiveAlgset}
                  options={algsetOptions}
                  onChange={(v) => { setAlgsetFilter(v); setPage(1); }}
                  open={openMenu === 'algset'}
                  onToggle={() => toggleMenu('algset')}
                  onClose={() => setOpenMenu(null)}
                />
              )}
            </div>
            <div className="flex items-center justify-items-start mr-auto gap-1.5 bg-neutral-700 p-1 rounded-sm">
              <button
                type="button"
                onClick={() => { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); setPage(1); setOpenMenu(null); }}
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
                onChange={(v) => { setSortKey(v); setPage(1); }}
                open={openMenu === 'sort'}
                onToggle={() => toggleMenu('sort')}
                onClose={() => setOpenMenu(null)}
              />
            </div>
            <div className="flex items-center gap-1.5 bg-neutral-700 p-1 rounded-sm md:hidden">
              <label className="flex items-center gap-1.5 px-2 h-7.5 border rounded-sm bg-dark border-neutral-600 text-primary-100 cursor-pointer hover:border-neutral-500">
                <input
                  type="checkbox"
                  checked={editMode}
                  onChange={(e) => setEditMode(e.target.checked)}
                  className="cursor-pointer accent-primary-100"
                />
                <span className="text-sm whitespace-nowrap">Edit Mode</span>
              </label>
            </div>
            <div className="flex items-center gap-1.5 bg-neutral-700 p-1 rounded-sm">
              <div className="flex items-center gap-1.5 pl-2 pr-1.5 h-7.5 border rounded-sm bg-dark border-neutral-600 hover:border-neutral-500 focus:border-neutral-500">
                <DownloadMenu
                  favorites={visible}
                  open={openMenu === 'download'}
                  onToggle={() => toggleMenu('download')}
                  onClose={() => setOpenMenu(null)}
                />
              </div>
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
        {activeEditor?.kind === 'add' ? (
          <AddAlgRow
            onAdd={handleAdd}
            onCancel={() => setActiveEditor((cur) => (cur?.kind === 'add' ? null : cur))}
          />
        ) : (
          <button type="button"
            onClick={() => setActiveEditor({ kind: 'add' })}
            className="flex items-center gap-3 text-primary-100 hover:text-primary-300 transition-colors
            px-1.5 py-1 bg-dark"
          >
            <AddIcon className="w-5 h-5 ml-1" />
            <span className="text-sm">Add an alg manually</span>
          </button>
        )}
      </div>
      {favorites.length > 0 && (
        <ul className="flex flex-col gap-1">
          {pageItems.map((fav) => (
            <li key={fav.alg}>
              <YourAlgCard
                alg={fav.alg}
                status={fav.status}
                algset={fav.algset}
                editMode={editMode}
                active={activeEditor?.kind === 'card' && activeEditor.alg === fav.alg}
                confirming={confirmingAlg === fav.alg}
                onEditStart={() => setActiveEditor({ kind: 'card', alg: fav.alg })}
                onEditEnd={() => setActiveEditor((cur) => (cur?.kind === 'card' && cur.alg === fav.alg ? null : cur))}
                onConfirmDelete={() => setConfirmingAlg(fav.alg)}
                onCancelDelete={() => setConfirmingAlg((cur) => (cur === fav.alg ? null : cur))}
                onToggleStatus={() => setFavoriteStatus(fav.alg, nextStatus(fav.status))}
                onSetAlgset={(algset) => setFavoriteAlgset(fav.alg, algset)}
                onSetAlg={(next) => handleSetAlg(fav.alg, next)}
                onDelete={() => { removeFavorite(fav.alg); setConfirmingAlg(null); }}
              />
            </li>
          ))}
        </ul>
      )}

      {visible.length > 0 && (
        <div
          ref={paginationRef}
          className="-mx-2 mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-neutral-600 px-2 pt-3 text-sm text-primary-100"
        >
          <div className="flex items-center gap-1">
            <NavBtn onClick={() => goToPage(1)} disabled={currentPage === 1} label="First page">
              <CaretIcon className="rotate-90" />
              <CaretIcon className="-ml-2 rotate-90" />
            </NavBtn>
            <NavBtn onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} label="Previous page">
              <CaretIcon className="rotate-90" />
            </NavBtn>
            <div className="flex items-center gap-1.5 px-1">
              <span>Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                disabled={totalPages === 1}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n)) goToPage(n);
                }}
                aria-label="Page number"
                className={`w-12 rounded-sm border bg-dark px-1.5 py-1 text-center focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${totalPages === 1 ? 'border-neutral-700 text-neutral-600 cursor-default' : 'border-neutral-600 text-primary-100 focus:border-neutral-500'}`}
              />
              <span className="whitespace-nowrap">of {totalPages}</span>
            </div>
            <NavBtn onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} label="Next page">
              <CaretIcon className="-rotate-90" />
            </NavBtn>
            <NavBtn onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} label="Last page">
              <CaretIcon className="-rotate-90" />
              <CaretIcon className="-ml-2 -rotate-90" />
            </NavBtn>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Show</span>
            <FilterSelect
              label="Algs per page"
              value={String(perPage)}
              options={perPageOptions}
              onChange={(v) => { setPerPage(Number(v)); setPage(1); }}
              open={openMenu === 'perPage'}
              onToggle={() => toggleMenu('perPage')}
              onClose={() => setOpenMenu(null)}
            />
            <span className="whitespace-nowrap">per page</span>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default YourAlgsList;
