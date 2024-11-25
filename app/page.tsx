'use client';
'use strict';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/recon');
  }, [router]);

  return null; // No need to render anything since we're redirecting
}

