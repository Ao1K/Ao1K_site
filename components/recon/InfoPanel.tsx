'use client';

import { useState, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import DropdownIcon from '../icons/dropdown';
import QuestionIcon from '../icons/info';
import { InfoPanelIntro } from './InfoPanelContent';
import { dismissInfoPanel } from '../../app/actions';

const LazyContent = dynamic(() => import('./InfoPanelContent'));

export default function InfoPanel({
  children,
  initiallyDismissed = false,
}: {
  children?: React.ReactNode;
  initiallyDismissed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initiallyDismissed);
  // track whether the user has ever expanded, so we skip mounting content until needed
  const [hasExpanded, setHasExpanded] = useState(!initiallyDismissed);
  // if the cookie was already set on mount, we never need to call the server action
  const hasDismissed = useRef(initiallyDismissed);

  const persistDismiss = () => {
    if (!hasDismissed.current) {
      hasDismissed.current = true;
      void dismissInfoPanel();
    }
  };

  const handleDismiss = () => {
    persistDismiss();
    setCollapsed(true);
    const scrollTop = Math.min(window.scrollY, 110)
    window.scrollTo({ top: scrollTop, behavior: 'auto' });
  };

  const handleToggle = () => {
    if (!hasExpanded) setHasExpanded(true);
    if (!collapsed) {
      // collapsing = dismissing
      persistDismiss();
      const scrollTop = Math.min(window.scrollY, 110);
      window.scrollTo({ top: scrollTop, behavior: 'auto' });
    }
    setCollapsed(c => !c);
  };

  return (
    <div className={`px-3 mt-4 ${collapsed ? 'mb-3' : 'mb-15'}`}>
      {/* header — always visible */}
      <button
        className="text-xl text-dark_accent hover:text-primary-100 transition-colors underline underline-offset-2 font-medium flex flex-row items-center gap-1 select-none"
        onClick={handleToggle}
      >
        <QuestionIcon className="w-8 h-8 mr-2"/>
        Info
        <DropdownIcon
          className="w-4 h-4"
          style={{ transition: 'transform 300ms ease', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* grid accordion — grid-template-rows is cheap: no layout reflow, compositor-friendly */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: collapsed ? '0fr' : '1fr',
          transition: 'grid-template-rows 300ms ease',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div
            className="mt-2 border rounded-sm border-primary-100 bg-primary-900 text-primary-100"
            style={{ transition: 'opacity 250ms ease', opacity: collapsed ? 0 : 1 }}
          >
            <div className="flex flex-row justify-between items-center p-4 pb-0">
              <div className="flex flex-row gap-2 items-end">
                <h1 className="text-3xl text-primary-300">The Reconstruct Tool</h1>
                <div className="h-fit pb-0.5 text-neutral-400">on Ao1K</div>
              </div>
            </div>
            <div className="bg-primary-100 w-full h-px mt-3"></div>
            {hasExpanded && (children ?? <Suspense fallback={<div className="p-4 space-y-4 text-sm leading-relaxed"><InfoPanelIntro /><div>Loading...</div></div>}><LazyContent /></Suspense>)}
            {hasExpanded && (
              <div className="flex justify-end p-4 pt-2">
                <button
                  className="px-4 py-1.5 bg-primary-800 border border-primary-100 text-primary-100 text-sm select-none hover:bg-primary-700 transition-colors"
                  onClick={handleDismiss}
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

