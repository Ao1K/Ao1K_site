// to test og image generation, go to recon page, input params, then replace /recon with /api/og in the URL bar

import { ImageResponse } from 'next/og';
import { customDecodeURL } from '../../../composables/recon/urlEncoding';
import { createPreviewContent, type ScreenshotData as PreviewData, type SolutionLine } from '../../../composables/recon/ScreenshotManager';
import { SimpleCube } from '../../../composables/recon/SimpleCube';
import { SimpleCubeInterpreter, type StepInfo } from '../../../composables/recon/SimpleCubeInterpreter';
import parseText from '../../../composables/recon/validateTextInput';
import validationToArray from '../../../composables/recon/validationToMoves';
import { getLineStepInfo } from '../../../composables/recon/getLineStepInfo';
import { fetchDailyScramble } from '../../../utils/fetchDailyScramble';
import React from 'react';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const PREVIEW_SCALE = 0.7; // full size = 1


// load Rubik font data from bundled files for Satori rendering
let rubikRegularData: Buffer | null = null;
let rubikBoldData: Buffer | null = null;
let dailyScramble: { date: string; scramble: string } | null = null;

function getRubikFonts(): { regular: Buffer; bold: Buffer } {
  if (rubikRegularData && rubikBoldData) return { regular: rubikRegularData, bold: rubikBoldData };
  const fontsDir = path.join(process.cwd(), 'app/api/og/fonts');
  rubikRegularData = fs.readFileSync(path.join(fontsDir, 'Rubik-Regular.ttf'));
  rubikBoldData = fs.readFileSync(path.join(fontsDir, 'Rubik-SemiBold.ttf'));
  return { regular: rubikRegularData, bold: rubikBoldData };
}

// computes icons for each solution line by simulating cube state
function computeLineIcons(
  scrambleMoves: string[],
  solutionLines: string[][]
): { stepInfo: StepInfo | null; hasEO: boolean }[] {
  const simpleCube = new SimpleCube();
  // pass empty array to skip loading algorithm suggester
  const interpreter = new SimpleCubeInterpreter([]);

  const allLineSteps: StepInfo[][] = [];

  // compute steps for each line incrementally
  for (let lineIdx = 0; lineIdx < solutionLines.length; lineIdx++) {
    const line = solutionLines[lineIdx];
    if (!line || line.length === 0) {
      allLineSteps.push([]);
      continue;
    }

    // build moves up to end of this line
    const movesUpToLine = solutionLines.slice(0, lineIdx + 1).flat();
    const allMoves = [...scrambleMoves, ...movesUpToLine];
    const cubeState = simpleCube.getCubeState(allMoves as any);
    const steps = interpreter.getStepsCompleted(cubeState);

    // get only new steps on this line (subtract previous steps)
    const prevSteps = allLineSteps.flat();
    const newSteps = steps.filter(step =>
      !prevSteps.some(prevStep =>
        prevStep.step === step.step &&
        prevStep.colors.length === step.colors.length &&
        prevStep.colors.every((color, index) => color === step.colors[index])
      )
    );

    allLineSteps.push(newSteps);
  }

  // consolidate each line's steps into a single icon
  return allLineSteps.map((lineSteps, idx) => {
    const prevSteps = allLineSteps.slice(0, idx).flat();
    return {
      ...getLineStepInfo(lineSteps, prevSteps),
    };
  });
}

function renderColoredText(text: string): React.ReactNode {
  const parsed = parseText(text);
  const elements: React.ReactNode[] = [];
  
  const getColor = (type: string) => {
    switch(type) {
      case 'invalid': return '#ef4444';
      case 'comment': return '#a3a3a3';
      case 'move': return '#d4d4d4'; // default text color
      case 'rep':
      case 'paren': return '#2979A4';
      default: return '#d4d4d4';
    }
  };

  if (parsed.length === 0) return null;

  let currentString = '';
  let lastType = parsed[0][1];
  
  for (const [char, type] of parsed) {
    // if type changes, push the accumulated string with the previous type's color
    if (type !== 'space' && type !== lastType) {
      elements.push(
        <span key={elements.length} style={{ color: getColor(lastType) }}>{currentString}</span>
      );
      currentString = '';
      lastType = type;
    }
    currentString += char;
  }
  
  if (currentString.length > 0) {
    elements.push(
      <span key={elements.length} style={{ color: getColor(lastType) }}>{currentString}</span>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      {elements}
    </div>
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    
    // Decode params
    const scramble = decodeURIComponent(customDecodeURL(searchParams.get('scramble') || ''));
    const solution = decodeURIComponent(customDecodeURL(searchParams.get('solution') || ''));
    const time = searchParams.get('time');
    const title = customDecodeURL(searchParams.get('title') || '');

    // reject payloads that are too large to prevent DoS via expensive parsing/rendering
    const MAX_MOVES_LEN = 2000;
    const MAX_TITLE_LEN = 200;
    if (scramble.length > MAX_MOVES_LEN || solution.length > MAX_MOVES_LEN) {
      return new Response('Input too large', { status: 400 });
    }
    if (title.length > MAX_TITLE_LEN) {
      return new Response('Title too large', { status: 400 });
    }

    const preview = searchParams.get('preview');
    const showPreview = preview !== '0';
    if (!showPreview) {
      return new Response(`OG image generation preview disabled`, {
        status: 400,
      });
    }

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
              src={`${origin}/Ao1K-Logo-v2.svg`}
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
      width: 1200 * PREVIEW_SCALE,
      height: 630 * PREVIEW_SCALE,
    };

    // Scramble processing
    // Parse lines separately to handle comments correctly, then merge valid parts
    const scrambleLines = scramble.split('\n');
    let cleanScramble = '';
    
    for (const line of scrambleLines) {
      const parsedLine = parseText(line);
      const validChars = parsedLine
        .filter(([_, type]) => type !== 'comment' && type !== 'invalid')
        .map(([char]) => char)
        .join('')
        .replace(/\s+/g, ' '); // normalize spaces
      
      if (validChars.trim()) {
        cleanScramble += (cleanScramble ? ' ' : '') + validChars.trim();
      }
    }

    const scrambleParsed = parseText(cleanScramble);
    const scrambleTokens = validationToArray(scrambleParsed, 300);
    const scrambleMoves = scrambleTokens.map(t => t.value);
    const renderedScramble = renderColoredText(cleanScramble);

    // Solution processing
    // We split by newline to preserve line structure for the image
    const solutionLinesText = solution.split('\n');
    
    const solutionData = solutionLinesText.map(lineText => {
      // Parse for logic (moves)
      const parsed = parseText(lineText);
      const tokens = validationToArray(parsed, 300);
      const moves = tokens.map(t => t.value);
      
      // Parse for display (colors)
      const rendered = renderColoredText(lineText);
      
      return {
        text: lineText,
        renderedText: rendered,
        moves
      };
    });

    const solutionMoveLines = solutionData.map(d => d.moves);
    
    // compute icons from logical moves
    const icons = computeLineIcons(scrambleMoves, solutionMoveLines);

    // calculate stats
    const flatMoves = solutionMoveLines.flat();
    const calculatedStm = flatMoves.filter(move => move.match(/[^xyz2']/g)).length;
    const timeNum = time ? parseFloat(time) : 0;
    // only use time if it's valid (not NaN, not 0, not negative, not > 99999)
    const isValidTime = !isNaN(timeNum) && timeNum > 0 && timeNum <= 99999;
    const calculatedTps = (isValidTime && calculatedStm > 0)
      ? (calculatedStm / timeNum).toFixed(2)
      : '';
    
    const solutionLines: SolutionLine[] = solutionData
      .map((d, i) => ({
        text: d.text,
        renderedText: d.renderedText,
        icon: icons[i]?.stepInfo || undefined,
        hasEO: icons[i]?.hasEO,
      }))
      .filter(line => line.text.trim() !== '');

    // check if scramble matches daily scramble
    let isScrambleOfTheDay = false;
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (!dailyScramble || dailyScramble.date !== today) {
        const raw = await fetchDailyScramble();
        if (raw) {
          const s = raw.split('\n').slice(1).join('');
          dailyScramble = { date: today, scramble: s };
        }
      }
      if (dailyScramble) {
        isScrambleOfTheDay = dailyScramble.scramble === scrambleMoves.join(' ');
      }
    } catch (e) {
      console.error('Failed to fetch daily scramble for comparison:', e);
    }

    const previewData: PreviewData = {
      scramble: cleanScramble,
      renderedScramble: renderedScramble,
      solutionLines,
      solveTime: isValidTime ? time! : '',
      totalMoves: calculatedStm,
      tpsString: calculatedTps ? `${calculatedTps} tps` : '',
      title: title || undefined,
      isScrambleOfTheDay,
    };

    const rubikFonts = getRubikFonts();

    return new ImageResponse(
      createPreviewContent({ data: previewData, createElement: React.createElement, scale: PREVIEW_SCALE }) as React.ReactElement,
      {
        ...imageOptions,
        fonts: [
          {
            name: 'Rubik',
            data: rubikFonts.regular,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Rubik',
            data: rubikFonts.bold,
            weight: 600,
            style: 'normal',
          },
        ],
        headers: {
          'Cache-Control': 'public, max-age=86400',
        },
      }
    );
  } catch (e: any) {
    if (e.message?.startsWith('Move limit')) {
      return new Response(e.message, { status: 400 });
    }
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
