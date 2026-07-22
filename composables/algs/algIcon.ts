// Builds the icon descriptor for a saved alg from its classification. F2L is the pair icon
// colored by the slot it solves; OLL (and other non-PLL last-layer cases) become a 5x5 case grid
// where the LL color reads in its real color and every other color a dark grey; PLL is the
// real-color grid with the case name in the center. Shared by the card and the export serializer.

import { f2lIsoDescriptor } from './f2lIsoIcon';
import { f2lPairTitle } from './multislotSlots';
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

// palette for an OLL grid: the LL face reads yellow the way a white-cross solver sees it, every
// other color a dark grey. Classification runs with the cross on D, so the LL lands on U (white).
export function llConfig(llColorName: string, cubeColors: CubeColors): ColorConfig {
  const config: ColorConfig = {
    up: LL_OTHER_GREY, down: LL_OTHER_GREY, front: LL_OTHER_GREY,
    back: LL_OTHER_GREY, right: LL_OTHER_GREY, left: LL_OTHER_GREY,
    gray: LL_OTHER_GREY, darkBg: DARK_BG,
  };
  const face = NAME_TO_FACE[llColorName?.toLowerCase()] ?? 'up';
  config[face] = cubeColors.down;
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
  title: string;
}

export function buildAlgIcon(c: AlgClassification, alg: string, cubeColors: CubeColors): AlgIconData {
  if (c.kind === 'f2l' || c.kind === 'multislot') {
    return { descriptor: f2lIsoDescriptor(alg, realColorConfig(cubeColors)), showName: false, title: f2lPairTitle(alg) };
  }
  if (c.kind === 'oll' && c.stepInfo) {
    const config = llConfig(c.stepInfo.colors[0], cubeColors);
    return { descriptor: getStepIconDescriptor(config, c.stepInfo), showName: false, title: c.label };
  }
  if (c.kind === 'pll' && c.stepInfo) {
    return { descriptor: getStepIconDescriptor(realColorConfig(cubeColors), c.stepInfo), showName: true, title: c.label };
  }
  return { descriptor: null, showName: false, title: c.label };
}
