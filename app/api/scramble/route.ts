import { NextResponse } from 'next/server';
import { randomScrambleForEvent } from 'cubing/scramble';

export const dynamic = 'force-dynamic';

const MAX_COUNT = 12;

const clampCount = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), MAX_COUNT);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const event = searchParams.get('event') || '333';
  const count = clampCount(searchParams.get('count'));

  try {
    const algs = await Promise.all(
      Array.from({ length: count }, () => randomScrambleForEvent(event))
    );
    return NextResponse.json(
      { scrambles: algs.map((alg) => alg.toString()) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Scramble generation failed:', error);
    return NextResponse.json({ error: 'scramble generation failed' }, { status: 500 });
  }
}
