import { NextResponse } from 'next/server';
import { randomScrambleForEvent } from 'cubing/scramble';
import { setSearchDebug } from 'cubing/search';

// TODO: switch to generating scrambles with cubing.js in the browser instead of this route. Turbopack breaks cubing.js's worker URL in client bundles, so it currently fails there.
export const dynamic = 'force-dynamic';

setSearchDebug({ logPerf: false, scramblePrefetchLevel: 'none' });

export async function GET() {
  try {
    const scramble = await randomScrambleForEvent('333');
    return NextResponse.json(
      { scramble: scramble.toString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Scramble generation failed:', error);
    return NextResponse.json({ error: 'scramble generation failed' }, { status: 500 });
  }
}
