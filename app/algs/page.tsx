import type { Metadata } from "next";
import AlgsContent from "../../components/algs/AlgsContent";
import type { AlgsetId } from "../../components/algs/AlgsetSelector";
import { configFromParams } from "../../composables/algs/f2lCaseId";

export const metadata: Metadata = {
  title: "Algs",
  description: "Visually search for F2L solutions, keep track of your algs",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/algs`,
  },
};

const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const algsetFromParam = (a: string | undefined): AlgsetId | null =>
  a === 'f2l' ? 'f2l' : null;

export default async function Algs({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  // seed from the URL on the server so the prerendered HTML matches the client's first render
  // (otherwise a case URL renders step 0 on the server but SLOTS on the client → hydration mismatch).
  const { cross, pair, config } = configFromParams(firstParam(params.p), firstParam(params.c));
  const initialAlgset = algsetFromParam(firstParam(params.a));

  return (
    <div className="flex flex-col items-center gap-4 pt-10 pb-10 px-6">
      <AlgsContent initialCross={cross} initialPair={pair} initialConfig={config} initialAlgset={initialAlgset} />
    </div>
  );
}
