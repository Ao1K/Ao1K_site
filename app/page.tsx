'use client';
'use strict';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const search = window.location.search;
    router.replace('/recon' + search);
  }, [router]);

  return null; // No need to render anything since we're redirecting
}

