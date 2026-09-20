'use client';

import { useEffect, useEffectEvent, useRef } from 'react';

const BACK_CANCEL_KEY = 'ao1kBackCancel';

function onCancelEntry(): boolean {
  return window.history.state?.[BACK_CANCEL_KEY] === true;
}

export function useBackCancel(armed: boolean, onCancel: () => void): void {
  const cancel = useEffectEvent(onCancel);
  const poppingSelf = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      if (poppingSelf.current) {
        poppingSelf.current = false;
        return;
      }
      cancel();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!armed) return;
    window.history.pushState({ [BACK_CANCEL_KEY]: true }, '');

    return () => {
      if (!onCancelEntry()) return;
      poppingSelf.current = true;
      window.history.back();
    };
  }, [armed]);
}
