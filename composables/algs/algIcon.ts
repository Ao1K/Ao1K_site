// Builds the icon descriptor for a saved alg from its classification. F2L stays the greyscale
// pair icon; OLL (and other non-PLL last-layer cases) become a greyscale 5x5 case grid where the
// LL color reads near-white and every other color a darker grey; PLL is the real-color grid with
// the case name in the center. Shared by the on-page card and the export serializer.

import { greyscalePairDescriptor, PAIR_LIGHT } from './pairIcon';
import { type AlgClassification } from './classifyAlg';
import {
  getStepIconDescriptor,
  type ColorConfig,
  type IconDescriptor,
} from '../recon/stepIconDescriptors';
import { type CubeColors } from '../useSettings';

const LL_OTHER_GREY = '#52525b';
const DARK_BG = '#161018';

const NAME_TO_FACE: Record<string, keyof Pick<ColorConfig, 'up' | 'down' | 'front' | 'back' | 'right' | 'left'>> = {
  white: 'up', yellow: 'down', green: 'front', blue: 'back', red: 'right', orange: 'left',
};

// greyscale palette for an OLL grid: the LL color (opposite the cross) is near-white, the rest grey
export function greyscaleLLConfig(llColorName: string): ColorConfig {
  const config: ColorConfig = {
    up: LL_OTHER_GREY, down: LL_OTHER_GREY, front: LL_OTHER_GREY,
    back: LL_OTHER_GREY, right: LL_OTHER_GREY, left: LL_OTHER_GREY,
    gray: LL_OTHER_GREY, darkBg: DARK_BG,
  };
  const face = NAME_TO_FACE[llColorName?.toLowerCase()] ?? 'up';
  config[face] = PAIR_LIGHT;
  return config;
}

export function realColorConfig(cubeColors: CubeColors): ColorConfig {
  return {
    up: cubeColors.up, down: cubeColors.down, front: cubeColors.front,
    back: cubeColors.back, right: cubeColors.right, left: cubeColors.left,
    gray: '#888888', darkBg: DARK_BG,
  };
}

export interface AlgIconData {
  descriptor: IconDescriptor | null;
  // PLL draws its case name as a center text overlay
  showName: boolean;
}

export function buildAlgIcon(c: AlgClassification, alg: string, cubeColors: CubeColors): AlgIconData {
  if (c.kind === 'f2l') {
    return { descriptor: greyscalePairDescriptor(alg), showName: false };
  }
  if (c.kind === 'oll' && c.stepInfo) {
    const config = greyscaleLLConfig(c.stepInfo.colors[0]);
    return { descriptor: getStepIconDescriptor(config, c.stepInfo), showName: false };
  }
  if (c.kind === 'pll' && c.stepInfo) {
    return { descriptor: getStepIconDescriptor(realColorConfig(cubeColors), c.stepInfo), showName: true };
  }
  // TODO: dedicated multislot icon. For now multislot falls through to the text/override path.
  return { descriptor: null, showName: false };
}
