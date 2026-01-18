'use client';

import { usePathname } from 'next/navigation';
import SettingsMenu from './SettingsMenu';

// Define which pages have settings and their page identifiers
const PAGE_SETTINGS: Record<string, string> = {
  '/recon': 'recon',
  '/recon/': 'recon',
  // Add more pages here as needed, e.g.:
  // '/practice': 'practice',
  // '/practice/': 'practice',
};

export default function SettingsMenuWrapper() {
  const pathname = usePathname();
  
  // Check if current page has settings
  const currentPageSettings = PAGE_SETTINGS[pathname || ''];
  
  if (!currentPageSettings) {
    return null;
  }
  
  return <SettingsMenu page={currentPageSettings} />;
}
