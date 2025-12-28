import { Suspense } from 'react';
import PageContent from '../../components/recon/_PageContent';
import { Metadata, ResolvingMetadata } from 'next';
import { customEncodeURL } from '../../composables/recon/urlEncoding';

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
  
  // apply custom encoding (spaces -> underscores) before setting params
  // URLSearchParams.set() will then handle standard encoding (newlines, etc.)
  // this matches the encoding used by updateURL
  if (searchParams.scramble) {
    let scramble = searchParams.scramble as string;
    while (scramble.endsWith('\n')) scramble = scramble.slice(0, -1);
    sp.set('scramble', customEncodeURL(scramble));
  }
  if (searchParams.solution) {
    let solution = searchParams.solution as string;
    while (solution.endsWith('\n')) solution = solution.slice(0, -1);
    sp.set('solution', customEncodeURL(solution));
  }
  if (searchParams.time) sp.set('time', searchParams.time as string);
  if (searchParams.title) {
    let title = searchParams.title as string;
    while (title.endsWith('\n')) title = title.slice(0, -1);
    sp.set('title', customEncodeURL(title));
  }
  if (searchParams.stm) sp.set('stm', searchParams.stm as string);
  if (searchParams.tps) sp.set('tps', searchParams.tps as string);
  if (searchParams.icons) sp.set('icons', searchParams.icons as string);

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