import type { StepInfo } from './SimpleCubeInterpreter';
import { ORBIT_PIECE_NAMES } from '@/components/recon/UnfoldedCube';

const COLOR_LETTER: Record<string, string> = {
  white: 'W', yellow: 'Y', green: 'G',
  red: 'R', blue: 'B', orange: 'O',
};

// canonical piece name: W or Y goes first, remaining letters sorted alphabetically
function canonicalizePiece(letters: string[]): string {
  const primary = letters.find(l => l === 'W' || l === 'Y') ?? '';
  const rest = letters.filter(l => l !== 'W' && l !== 'Y').sort();
  return primary + rest.join('');
}

function allPieces(): Set<string> {
  return new Set([
    ...ORBIT_PIECE_NAMES.CORNERS,
    ...ORBIT_PIECE_NAMES.EDGES,
    ...ORBIT_PIECE_NAMES.CENTERS,
  ]);
}

// returns the set of color-based piece names that should be highlighted for a given sequence of step infos.
// centers are always included. returns all pieces when the step type isn't specifically handled.
export function getAutoHighlight(relevantStepInfos: (StepInfo | null)[]): Set<string> {
  const steps = relevantStepInfos.filter((s): s is StepInfo => s !== null);
  if (steps.length === 0) return allPieces();

  const lastStep = steps[steps.length - 1];

  const isCrossStep = lastStep.type === 'cross';
  const isF2LStep =
    lastStep.type === 'f2l' &&
    (lastStep.step === 'pair' || lastStep.step === 'multislot');

  if (!isCrossStep && !isF2LStep) return allPieces();

  // find the cross color from the first cross step, but stop if an f2l step appears first
  let crossColor: string | null = null;
  for (const step of steps) {
    if (step.type === 'cross') {
      crossColor = step.colors[0];
      break;
    }
    if (step.type === 'f2l') break;
  }

  if (!crossColor) return allPieces();
  const crossLetter = COLOR_LETTER[crossColor];
  if (!crossLetter) return allPieces();

  const highlighted = new Set(ORBIT_PIECE_NAMES.CENTERS);

  // add all 4 cross edges
  for (const edge of ORBIT_PIECE_NAMES.EDGES) {
    if (edge.includes(crossLetter)) highlighted.add(edge);
  }

  // add pieces for a single f2l pair given its two slot colors
  const addPair = (slotColors: string[]) => {
    const letters = slotColors
      .map(c => COLOR_LETTER[c])
      .filter((l): l is string => !!l);
    if (letters.length < 2) return;
    highlighted.add(canonicalizePiece(letters));
    highlighted.add(canonicalizePiece([crossLetter, ...letters]));
  };

  // collect all f2l pair pieces from every step in history
  let totalPairsSolved = 0;
  for (const step of steps) {
    if (!step.f2lSlotList) continue;
    for (const slotDirections of step.f2lSlotList) {
      const slotColors = Object.values(slotDirections).filter(Boolean) as string[];
      addPair(slotColors);
      totalPairsSolved++;
    }
  }

  // all 4 pairs solved → highlight everything
  if (totalPairsSolved >= 4) return allPieces();

  return highlighted;
}
