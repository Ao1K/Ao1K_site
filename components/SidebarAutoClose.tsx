'use client';

import { useEffect } from 'react';

export default function SidebarAutoClose() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a')) {
        const checkbox = document.getElementById('sidebar-toggle') as HTMLInputElement;
        if (checkbox) checkbox.checked = false;
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return null;
}
