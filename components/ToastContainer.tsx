'use client';

import type { CSSProperties } from 'react';

import { useToasts, dismissToast, dismissToastPermanently } from '../composables/toast';
import { useVisualViewportOffsetTop } from '../composables/useVisualViewport';
import CloseIcon from './icons/close';

export default function ToastContainer() {
  const toasts = useToasts();
  const viewportOffsetTop = useVisualViewportOffsetTop();

  if (toasts.length === 0) return null;

  const viewportStyle = { '--visual-viewport-top': `${viewportOffsetTop}px` } as CSSProperties;

  return (
    <div
      style={viewportStyle}
      className="z-42 max-sm:sticky max-sm:top-(--visual-viewport-top,0px) sm:fixed sm:inset-x-0 sm:bottom-4"
    >
      <div className="absolute max-sm:top-4 sm:bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="toast-enter pointer-events-auto flex items-center gap-3 w-full rounded-sm border border-primary-300 bg-primary-100 text-dark shadow-lg px-4 py-3"
          >
            {toast.icon && <div className="shrink-0 flex items-center">{toast.icon}</div>}
            <div className="grow text-sm">{toast.message}</div>
            {toast.dismissKey && (
              <button
                type="button"
                onClick={() => dismissToastPermanently(toast.id)}
                className="shrink-0 text-xs text-neutral-500 hover:text-primary-800 whitespace-nowrap"
              >
                Don&apos;t show again
              </button>
            )}
            {toast.closable && (
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss"
                className="shrink-0 -mr-1.5 p-1 text-neutral-500 hover:text-primary-800"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
