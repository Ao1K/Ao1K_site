'use client';

import { lazy, Suspense } from 'react';

const PageContent = lazy(() => import('../../components/recon/_PageContent'));

export default function Page() {
  return (

    <Suspense fallback={    
      <div className="fixed inset-0 flex items-center justify-center bg-primary-900">
        <img
          src="/LoadingSpinner.webp"
          alt="Loading..."
          className="w-16 h-16 mx-auto"
        />
      </div>}>
      <PageContent />
    </Suspense>
  );
}