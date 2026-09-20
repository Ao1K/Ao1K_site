'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { setHeaderHidden } from '../../composables/useHeaderAutoHide';
import { useStatsLayout } from '../../composables/notimer/statsLayout';
import { useWideLayout } from '../../composables/notimer/useWideLayout';
import SolveFeed from './SolveFeed';
import StatsDisplayPanel from './stats/StatsDisplayPanel';
import StatsDrawer from './stats/StatsDrawer';
import StatsSidebar from './stats/StatsSidebar';
import { elementsOnSide } from './stats/statElements';

const statsButtonClass =
  'rounded-sm border border-neutral-600 bg-dark px-1.5 py-0.5 text-dark_accent transition-colors hover:border-neutral-500 hover:text-primary-100';

export default function NotimerWorkspace(): React.ReactElement {
  const [cursorIndex, setCursorIndex] = useState(0);
  const [displayPanelOpen, setDisplayPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const twoSidebars = useWideLayout();
  const { settings } = useStatsLayout();

  useEffect(() => {
    setHeaderHidden(true);
    document.body.style.overflow = 'hidden';
    return () => {
      setHeaderHidden(false);
      document.body.style.overflow = '';
    };
  }, []);

  const leftElements = elementsOnSide(settings.placements, 'left', false);
  const rightElements = elementsOnSide(settings.placements, 'right', false);
  const drawerElements = elementsOnSide(settings.placements, 'right', true);

  const drawerVisible = drawerOpen && !twoSidebars;
  const displayPanelVisible = displayPanelOpen && twoSidebars;

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeDisplayPanel = useCallback(() => setDisplayPanelOpen(false), []);

  const handleDisplayPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeDisplayPanel();
  };

  const statsControl = twoSidebars ? (
    <span className="relative">
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setDisplayPanelOpen((open) => !open)}
        aria-expanded={displayPanelVisible}
        className={statsButtonClass}
      >
        Display
      </button>

      {displayPanelVisible && (
        <div
          role="dialog"
          aria-label="Statistics display"
          onKeyDown={handleDisplayPanelKeyDown}
          className="absolute right-0 bottom-full z-30 mb-2 w-64 rounded-sm border border-neutral-600 bg-dark p-2 shadow-lg shadow-black/50"
        >
          <StatsDisplayPanel showSides />
        </div>
      )}
    </span>
  ) : (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => setDrawerOpen(true)}
      className={statsButtonClass}
    >
      Statistics
    </button>
  );

  return (
    <div className="relative -mt-16 flex h-dvh flex-row overflow-hidden bg-primary-900 sm:mt-0 sm:h-[calc(100dvh-4rem)]">
      <div className="mr-5 flex-1 grid-lines-50-l" />

      <main className="main-content flex w-full max-w-147.5 flex-col bg-primary-900">
        <SolveFeed
          onCursorChange={setCursorIndex}
          keyboardBlocked={drawerVisible || displayPanelVisible}
          footerSlot={statsControl}
        />
      </main>

      <div className="ml-5 flex-1 grid-lines-50-r" />

      {twoSidebars && leftElements.length > 0 && (
        <StatsSidebar
          label="Left statistics"
          elements={leftElements}
          cursorIndex={cursorIndex}
          className="left-0 border-r border-neutral-800"
        />
      )}

      {twoSidebars && rightElements.length > 0 && (
        <StatsSidebar
          label="Right statistics"
          elements={rightElements}
          cursorIndex={cursorIndex}
          className="right-0 border-l border-neutral-800"
        />
      )}

      {drawerVisible && (
        <StatsDrawer elements={drawerElements} cursorIndex={cursorIndex} onClose={closeDrawer} />
      )}

      {displayPanelVisible && (
        <div className="absolute inset-0 z-20" onMouseDown={closeDisplayPanel} />
      )}
    </div>
  );
}
