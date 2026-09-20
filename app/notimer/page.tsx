'use client';

import dynamic from 'next/dynamic';

const NotimerWorkspace = dynamic(() => import('../../components/notimer/NotimerWorkspace'), {
  ssr: false,
  loading: () => (
    <div className="-mt-16 grid h-dvh place-items-center bg-primary-900 text-primary-400 sm:mt-0 sm:h-[calc(100dvh-4rem)]">
      Loading
    </div>
  ),
});

export default function NoTimerPage() {
  return <NotimerWorkspace />;
}
