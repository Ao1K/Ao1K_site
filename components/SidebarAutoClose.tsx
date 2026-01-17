'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Client component that automatically closes the sidebar when navigation occurs
 */
export default function SidebarAutoClose() {
  const pathname = usePathname();

  useEffect(() => {
    // Uncheck the sidebar toggle checkbox when pathname changes
    const checkbox = document.getElementById('sidebar-toggle') as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = false;
    }
  }, [pathname]);

  return null;
}
