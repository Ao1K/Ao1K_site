import { NextResponse } from 'next/server';
import { randomScrambleForEvent } from 'cubing/scramble';
import { setSearchDebug } from 'cubing/search';

// TODO: switch to generating scrambles with cubing.js in the browser instead of this route. Turbopack breaks cubing.js's worker URL in client bundles, so it currently fails there.
export const dynamic = 'force-dynamic';

setSearchDebug({ logPerf: false, scramblePrefetchLevel: 'none' });

const SCRAMBLE_TIMEOUT_MS = 5000;

export async function GET() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`scramble generation timed out after ${SCRAMBLE_TIMEOUT_MS}ms`)),
      SCRAMBLE_TIMEOUT_MS
    );
  });

  try {
    const scramble = await Promise.race([randomScrambleForEvent('333'), timeout]);
    return NextResponse.json(
      { scramble: scramble.toString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Scramble generation failed:', error);
    return NextResponse.json({ error: 'scramble generation failed' }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
