import { Suspense } from 'react';
import PageContent from '../../components/recon/_PageContent';
import { Metadata, ResolvingMetadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const sp = new URLSearchParams();
  
  if (searchParams.scramble) sp.set('scramble', searchParams.scramble as string);
  if (searchParams.solution) sp.set('solution', searchParams.solution as string);
  if (searchParams.time) sp.set('time', searchParams.time as string);
  if (searchParams.title) sp.set('title', searchParams.title as string);

  const ogUrl = `/api/og?${sp.toString()}`;

  return {
    openGraph: {
      images: [ogUrl],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogUrl],
    },
  }
}

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