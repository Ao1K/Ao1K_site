import { lazy } from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { cookies } from 'next/headers';
import InfoPanelContent from '../../components/recon/InfoPanelContent';

const PageContent = lazy(() => import('../../components/recon/_PageContent'));
import { fetchDailyScramble } from '../../utils/fetchDailyScramble';
import { editorAliases, OG_PREVIEW_SIZE, OG_LOGO_SIZE } from '../../utils/sharedConstants';

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
  const getParam = (name: string) => {
    const aliases = editorAliases[name] ?? [];
    return (searchParams[name] ?? aliases.reduce<string | string[] | undefined>((found, alias) => found ?? searchParams[alias], undefined)) as string | undefined;
  };
  if (getParam('scramble')) sp.set('scramble', getParam('scramble')!);
  if (getParam('solution')) sp.set('solution', getParam('solution')!);
  if (searchParams.time) sp.set('time', searchParams.time as string);
  if (searchParams.title) sp.set('title', searchParams.title as string);
  if (searchParams.stm && /^\d+(\.\d+)?$/.test(searchParams.stm as string)) sp.set('stm', searchParams.stm as string);
  if (searchParams.tps && /^\d+(\.\d+)?$/.test(searchParams.tps as string)) sp.set('tps', searchParams.tps as string);
  if (searchParams.preview !== undefined) sp.set('preview', searchParams.preview as string);

  const qs = sp.toString();
  const ogUrl = qs ? `/api/og?${qs}` : '/api/og';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const canonicalUrl = qs ? `${baseUrl}/recon?${qs}` : `${baseUrl}/recon`;
  
  let pageTitle = "Reconstruction";

  const ogSize = getParam('scramble') && getParam('solution') ? OG_PREVIEW_SIZE : OG_LOGO_SIZE;
  const ogImage = { url: ogUrl, ...ogSize };

  return {
    title: pageTitle,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      images: [ogImage],
    },
    twitter: {
      images: [ogImage],
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