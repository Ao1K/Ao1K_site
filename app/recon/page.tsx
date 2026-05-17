import { lazy } from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { cookies } from 'next/headers';
import InfoPanelContent from '../../components/recon/InfoPanelContent';

const PageContent = lazy(() => import('../../components/recon/_PageContent'));
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
  
  // searchParams are already custom-encoded by the client (updateURL calls customEncodeURL)
  if (searchParams.scramble) sp.set('scramble', searchParams.scramble as string);
  if (searchParams.solution) sp.set('solution', searchParams.solution as string);
  if (searchParams.time) sp.set('time', searchParams.time as string);
  if (searchParams.title) sp.set('title', searchParams.title as string);
  if (searchParams.stm && /^\d+(\.\d+)?$/.test(searchParams.stm as string)) sp.set('stm', searchParams.stm as string);
  if (searchParams.tps && /^\d+(\.\d+)?$/.test(searchParams.tps as string)) sp.set('tps', searchParams.tps as string);
  if (searchParams.preview !== undefined) sp.set('preview', searchParams.preview as string);

  const ogUrl = `/api/og?${sp.toString()}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const canonicalUrl = `${baseUrl}/recon?${sp.toString()}`;
  
  let pageTitle = "Reconstruction";

  const keywords = ["speedcubing", "reconstruction", "rubik's cube", "solve analysis", "alg", "algorithm"];

  return {
    title: pageTitle,
    keywords: keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      images: [ogUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      images: [ogUrl],
    },
  }
}

export default async function Page() {
  let dailyScramble = await fetchDailyScramble();
  const [comment, scramble] = dailyScramble.split('\n');
  dailyScramble = `<div><span class="text-gray-500">// Scramble of the day</span><br></div><div><span class="text-gray-500">// ${comment}</span><br></div><div><span class="text-primary-100">${scramble}</span><br></div>`;

  const cookieStore = await cookies();
  const infoPanelDismissed = cookieStore.get('infoPanelDismissed_v1')?.value === 'true';

  return <PageContent dailyScramble={dailyScramble} infoPanelSlot={infoPanelDismissed ? null : <InfoPanelContent />} />;
}