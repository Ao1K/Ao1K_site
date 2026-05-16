'use client';

import { useEffect } from 'react';

export default function SidebarAutoClose() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('#settings-menu-container')) {
        const checkbox = document.getElementById('sidebar-toggle') as HTMLInputElement;
        if (checkbox) checkbox.checked = false;
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return null;
}
