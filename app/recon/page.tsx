import { Suspense, lazy } from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { cookies } from 'next/headers';

const PageContent = lazy(() => import('../../components/recon/_PageContent'));
import ReconSkeleton from '../../components/recon/ReconSkeleton';
import { customEncodeURL } from '../../composables/recon/urlEncoding';
import { fetchDailyScramble } from '../../utils/fetchDailyScramble';

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

  const ogUrl = `/api/og?${sp.toString()}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const canonicalUrl = `${baseUrl}/recon?${sp.toString()}`;

  const titleParam = searchParams.title as string | undefined;
  const timeParam = searchParams.time as string | undefined;
  
  let pageTitle = "Reconstruction Tool";
  if (titleParam) {
    pageTitle = titleParam;
  } else if (timeParam) {
    pageTitle = `${timeParam}s Solve Reconstruction`;
  }

  const description = `${timeParam ? `${timeParam}s solve` : 'Statistically significant speedcubing analysis'}`;

  const keywords = ["speedcubing", "reconstruction", "rubik's cube", "solve analysis", "alg", "algorithm"];
  if (timeParam) keywords.push(`${timeParam}s solve`);

  return {
    title: pageTitle,
    description: description,
    keywords: keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description: description,
      images: [ogUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: description,
      images: [ogUrl],
    },
  }
}

export default async function Page() {
  let dailyScramble = await fetchDailyScramble();
  dailyScramble = `// Scramble of the day\n${dailyScramble}`;

  const cookieStore = await cookies();
  const videoHelpDismissed = cookieStore.get('videoHelpDismissed')?.value === 'true';

  return (
    <Suspense fallback={<ReconSkeleton />}>
      <PageContent dailyScramble={dailyScramble} videoHelpDismissed={videoHelpDismissed} />
    </Suspense>
  );
}