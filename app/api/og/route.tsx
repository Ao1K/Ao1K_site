import { ImageResponse } from 'next/og';
import { customDecodeURL } from '../../../composables/recon/urlEncoding';
import { createScreenshotContent, type ScreenshotData, type SolutionLine } from '../../../composables/recon/ScreenshotManager';
import { deserializeLineIcons } from '../../../composables/recon/StepIconRenderer';
import React from 'react';

export const runtime = 'nodejs';

// filters text to only valid cube moves, preserving line structure if preserveNewlines is true
function filterToValidMoves(text: string, preserveNewlines: boolean = false): string {
  const validMoves = [
    "U", "U2", "U3", "U'", "U2'", "U3'",
    "u", "u2", "u3", "u'", "u2'", "u3'",
    "D", "D2", "D3", "D'", "D2'", "D3'",
    "d", "d2", "d3", "d'", "d2'", "d3'",
    "R", "R2", "R3", "R'", "R2'", "R3'",
    "r", "r2", "r3", "r'", "r2'", "r3'",
    "L", "L2", "L3", "L'", "L2'", "L3'",
    "l", "l2", "l3", "l'", "l2'", "l3'",
    "F", "F2", "F3", "F'", "F2'", "F3'",
    "f", "f2", "f3", "f'", "f2'", "f3'",
    "B", "B2", "B3", "B'", "B2'", "B3'",
    "b", "b2", "b3", "b'", "b2'", "b3'",
    "x","x'","x2","x2'","y","y'","y2","y2'","z","z'","z2","z2'",
    "M","M'","M2","M2'","E","E'","E2","E2'","S","S'","S2","S2'",
  ];
  
  const validSet = new Set(validMoves);
  
  if (preserveNewlines) {
    // split by newlines, filter each line, then rejoin with newlines
    const lines = text.split('\n\n');
    return lines
      .map(line => {
        const tokens = line.split(/\s+/).filter(t => t.length > 0);
        return tokens.filter(token => validSet.has(token)).join(' ');
      })
      .join('\n');
  } else {
    // replace newlines with spaces, then filter
    const normalizedText = text.replace(/\n/g, ' ');
    const tokens = normalizedText.split(/\s+/).filter(t => t.length > 0);
    return tokens.filter(token => validSet.has(token)).join(' ');
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    
    // Decode params
    const scramble = decodeURI(customDecodeURL(searchParams.get('scramble') || ''));
    const solution = decodeURI(customDecodeURL(searchParams.get('solution') || ''));
    console.log('[OG Route] Decoded solution:', solution);
    const time = searchParams.get('time');
    const title = customDecodeURL(searchParams.get('title') || '');
    const stm = searchParams.get('stm');
    const tps = searchParams.get('tps');
    const iconsParam = searchParams.get('icons');

    if (!scramble || !solution) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#161018',
            }}
          >
            <img
              src={`${origin}/Ao1K%20Logo%20v2.svg`}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ),
        {
          width: 143,
          height: 74,
        }
      );
    }

    const imageOptions = {
      width: 1200,
      height: 630,
    };

    // filter to only valid moves and parse solution lines with icons
    const filteredScramble = filterToValidMoves(scramble, false);
    const filteredSolution = filterToValidMoves(solution, true);
    const solutionTextLines = filteredSolution.split('\n');
    const icons = iconsParam ? deserializeLineIcons(decodeURIComponent(iconsParam)) : [];
    
    // pair text with icon first, then filter out lines with no text AND no icon
    const solutionLines: SolutionLine[] = solutionTextLines
      .map((text, i) => ({
        text: text,
        icon: icons[i] || null,
      }))
      .filter(line => line.text.trim() !== '');

    const screenshotData: ScreenshotData = {
      scramble: filteredScramble,
      solutionLines,
      solveTime: time || '',
      totalMoves: stm ? parseInt(stm, 10) : 0,
      tpsString: tps || '',
      title: title || undefined,
    };

    return new ImageResponse(
      createScreenshotContent({ data: screenshotData, createElement: React.createElement }) as React.ReactElement,
      imageOptions
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
