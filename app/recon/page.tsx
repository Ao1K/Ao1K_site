import { lazy } from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { cookies, headers } from 'next/headers';
import InfoPanelContent from '../../components/recon/InfoPanelContent';

const PageContent = lazy(() => import('../../components/recon/_PageContent'));
import { fetchDailyScramble } from '../../utils/fetchDailyScramble';
import { editorAliases, OG_PREVIEW_SIZE } from '../../utils/sharedConstants';
import { customDecodeURL } from '../../composables/recon/urlEncoding';
import { prerenderReconCube, type CubePrerender } from '../../composables/recon/prerenderCube';

type SearchParams = { [key: string]: string | string[] | undefined }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}

const rawEditorParam = (searchParams: SearchParams, name: string) => {
  const aliases = editorAliases[name] ?? [];
  return (searchParams[name] ?? aliases.reduce<string | string[] | undefined>((found, alias) => found ?? searchParams[alias], undefined)) as string | undefined;
};

const decodedEditorParam = (searchParams: SearchParams, name: string): string => {
  const raw = rawEditorParam(searchParams, name);
  if (typeof raw !== 'string') return '';
  try {
    return decodeURIComponent(customDecodeURL(raw));
  } catch {
    return customDecodeURL(raw);
  }
};

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const sp = new URLSearchParams();
  
  // searchParams are already custom-encoded by the client (updateURL calls customEncodeURL)
  const getParam = (name: string) => rawEditorParam(searchParams, name);
  if (getParam('scramble')) sp.set('scramble', getParam('scramble')!);
  if (getParam('solution')) sp.set('solution', getParam('solution')!);
  if (searchParams.time) sp.set('time', searchParams.time as string);
  if (searchParams.title) sp.set('title', searchParams.title as string);
  if (searchParams.stm && /^\d+(\.\d+)?$/.test(searchParams.stm as string)) sp.set('stm', searchParams.stm as string);
  if (searchParams.tps && /^\d+(\.\d+)?$/.test(searchParams.tps as string)) sp.set('tps', searchParams.tps as string);
  if (searchParams.preview !== undefined) sp.set('preview', searchParams.preview as string);

  const qs = sp.toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const canonicalUrl = qs ? `${baseUrl}/recon?${qs}` : `${baseUrl}/recon`;

  let pageTitle = "Reconstruction";

  const hasPreview = Boolean(getParam('scramble') && getParam('solution')) && searchParams.preview !== '0';

  if (!hasPreview) {
    return {
      title: pageTitle,
      alternates: {
        canonical: canonicalUrl,
      },
    }
  }

  const ogImage = { url: `/api/og?${qs}`, ...OG_PREVIEW_SIZE };

  return {
    title: pageTitle,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage],
    },
  }
}

export default async function Page(props: Props) {
  let dailyScramble = await fetchDailyScramble();
  const [comment, scramble] = dailyScramble.split('\n');
  dailyScramble = `<div><span class="text-gray-500">// Scramble of the day</span><br></div><div><span class="text-gray-500">// ${comment}</span><br></div><div><span class="text-primary-100">${scramble}</span><br></div>`;

  const cookieStore = await cookies();
  const infoPanelDismissed = cookieStore.get('infoPanelDismissed_v1')?.value === 'true';

  const searchParams = await props.searchParams;
  const headerStore = await headers();
  const isPhone = headerStore.get('sec-ch-ua-mobile') === '?1' || /Mobi/i.test(headerStore.get('user-agent') ?? '');
  let cubePrerender: CubePrerender | null = null;
  try {
    cubePrerender = prerenderReconCube(
      {
        scramble: decodedEditorParam(searchParams, 'scramble'),
        solution: decodedEditorParam(searchParams, 'solution'),
        dailyScramble: scramble ?? '',
        solutionEditorAutofocus: infoPanelDismissed,
      },
      cookieStore.get('ao1kSettings')?.value,
      isPhone,
    );
  } catch (e) {
    console.error('Failed to prerender recon cube:', e);
  }

  return (
    <PageContent
      dailyScramble={dailyScramble}
      infoPanelSlot={infoPanelDismissed ? null : <InfoPanelContent />}
      cubePrerender={cubePrerender}
    />
  );
}