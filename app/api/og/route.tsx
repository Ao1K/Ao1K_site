import { ImageResponse } from 'next/og';
import { customDecodeURL } from '../../../composables/recon/urlEncoding';
import { createScreenshotContent, type ScreenshotData, type SolutionLine } from '../../../composables/recon/ScreenshotManager';
import { type StepIconData, type Grid } from '../../../composables/recon/StepIconRenderer';
import { SimpleCube } from '../../../composables/recon/SimpleCube';
import { SimpleCubeInterpreter, type StepInfo } from '../../../composables/recon/SimpleCubeInterpreter';
import React from 'react';

export const runtime = 'nodejs';

// converts StepInfo[] to a single StepIconData for display
// mirrors getLineStepInfo logic from ImageStack.tsx
function consolidateStepsToIcon(
  currentSteps: StepInfo[],
  prevSteps: StepInfo[]
): StepIconData | null {
  if (currentSteps.length === 0) return null;

  // get the most recent pattern from previous steps
  let prevPattern: Grid = [];
  for (let i = prevSteps.length - 1; i >= 0; i--) {
    if (prevSteps[i].pattern && prevSteps[i].pattern!.length > 0) {
      prevPattern = prevSteps[i]!.pattern!;
      break;
    }
  }

  // priority: solved > last layer steps > f2l > cross
  for (const step of currentSteps) {
    if (step.type === 'solved') {
      return { step: 'solved', type: 'solved', colors: step.colors, pattern: prevPattern };
    }
  }

  const llSteps = currentSteps.filter(step => step.type === 'last layer');
  const llStepNames = llSteps.map(s => s.step);
  const prevLLSteps = prevSteps.filter(step => step.type === 'last layer').map(s => s.step);
  const f2lSteps = currentSteps.filter(step => step.type === 'f2l');
  const crossSteps = currentSteps.filter(step => step.type === 'cross');

  // xcross, xxcross, etc
  if (crossSteps.length === 1 && f2lSteps.length > 0) {
    const colors = [...crossSteps[0].colors];
    colors.push(...f2lSteps.flatMap(step => step.colors));
    return { step: "x".repeat(f2lSteps.length) + 'cross', type: 'cross', colors };
  }

  // F2L pairs
  if (f2lSteps.length > 1) {
    const uniqueColors = [...new Set(f2lSteps.flatMap(step => step.colors))];
    return { step: 'multislot', type: 'f2l', colors: uniqueColors };
  } else if (f2lSteps.length === 1) {
    return { step: 'pair', type: 'f2l', colors: [...new Set([...f2lSteps[0].colors])] };
  }

  // LL combos
  if (llStepNames.includes('ep') && llStepNames.includes('cp') && llStepNames.includes('co') && llStepNames.includes('eo')) {
    return { step: '1lll', type: 'last layer', colors: llSteps[0]?.colors || [], pattern: prevPattern };
  }
  if (llStepNames.includes('ep') && llStepNames.includes('cp') && llStepNames.includes('co')) {
    return { step: 'zbll', type: 'last layer', colors: llSteps[0]?.colors || [], pattern: prevPattern };
  }
  if (llStepNames.includes('eo') && llStepNames.includes('cp') && llStepNames.includes('co')) {
    return { step: 'oll(cp)', type: 'last layer', colors: llSteps[0]?.colors || [], pattern: prevPattern };
  }
  if (llStepNames.includes('eo') && llStepNames.includes('co')) {
    return { step: 'oll', type: 'last layer', colors: llSteps[0]?.colors || [], pattern: prevPattern };
  }
  if (llStepNames.includes('ep') && llStepNames.includes('cp')) {
    return { step: 'pll', type: 'last layer', colors: llSteps[0]?.colors || [], pattern: prevPattern };
  }
  if (llStepNames.includes('co') && llStepNames.includes('cp') && prevLLSteps.includes('eo')) {
    return { step: 'coll', type: 'last layer', colors: llSteps[0]?.colors || [], pattern: prevPattern };
  }
  if (llStepNames.includes('eo') && llStepNames.includes('ep')) {
    return { step: 'ell', type: 'last layer', colors: llSteps[0]?.colors || [], pattern: prevPattern };
  }
  if (llStepNames.includes('co') && llStepNames.includes('cp')) {
    return { step: 'cll', type: 'last layer', colors: llSteps[0]?.colors || [], pattern: prevPattern };
  }

  // individual LL steps
  if (currentSteps.length === 1 && llSteps.length === 1) {
    const step = llSteps[0];
    if (step.step === 'eo') return { step: '1st look oll', type: 'last layer', colors: step.colors, pattern: prevPattern };
    if (step.step === 'co') return { step: '2nd look oll', type: 'last layer', colors: step.colors, pattern: prevPattern };
    if (step.step === 'cp') return { step: '1st look pll', type: 'last layer', colors: step.colors, pattern: prevPattern };
    if (step.step === 'ep') return { step: '2nd look pll', type: 'last layer', colors: step.colors, pattern: prevPattern };
  }

  // cross
  if (crossSteps.length > 0) return { step: 'cross', type: 'cross', colors: crossSteps[crossSteps.length - 1].colors };

  // fallback
  const lastStep = currentSteps[currentSteps.length - 1];
  return { step: lastStep.step, type: lastStep.type, colors: lastStep.colors, pattern: lastStep.pattern };
}

// computes icons for each solution line by simulating cube state
function computeLineIcons(
  scrambleMoves: string[],
  solutionLines: string[][]
): (StepIconData | null)[] {
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
    return consolidateStepsToIcon(lineSteps, prevSteps);
  });
}

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

    // filter to only valid moves and parse solution into lines
    const filteredScramble = filterToValidMoves(scramble, false);
    const filteredSolution = filterToValidMoves(solution, true);
    const solutionTextLines = filteredSolution.split('\n');
    
    // parse moves into arrays for icon computation
    const scrambleMoves = filteredScramble.split(/\s+/).filter(t => t.length > 0);
    const solutionMoveLines = solutionTextLines.map(line => 
      line.split(/\s+/).filter(t => t.length > 0)
    );
    
    // compute icons at runtime from scramble + solution
    const icons = computeLineIcons(scrambleMoves, solutionMoveLines);
    
    // pair text with computed icon, then filter out empty lines
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
