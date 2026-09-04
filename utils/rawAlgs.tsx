// TO USE:
// 1. Add new algs to the appropriate JSON data file. Generic algs are objects; last layer algs are plain strings.
// 2. For generic algs, add the "new": false field to the alg object.
// 3. For OLL, PLL, and ZBLL, run `pnpm mirror-algs utils/raw<STEP>data.json` to regenerate the _righty and _lefty lists.
//    Algs listed in frequentLeftAlgs.json are added to the _righty list as-is, and their M mirrors to the _lefty list.
// 4. Compile, either way:
//    - `pnpm compile-algs <types...>` writes straight to public/recon. Omit the types or pass `all` for every set.
//    - Or uncomment the AlgCompiler component in _PageContent, `pnpm dev`, select algorithm types, and run the tool
//      to download the same files.

// cast as unknown to avoid TypeScript inferring huge literal union types from JSON
import generic from './rawGenericData.json';
import OLL from './rawOLLdata.json';
import OLLrighty from './rawOLLdata_righty.json';
import OLLlefty from './rawOLLdata_lefty.json';
import PLL from './rawPLLdata.json';
import PLLrighty from './rawPLLdata_righty.json';
import PLLlefty from './rawPLLdata_lefty.json';
import ZBLL from './rawZBLLdata.json';
import ZBLLrighty from './rawZBLLdata_righty.json';
import ZBLLlefty from './rawZBLLdata_lefty.json';

export interface ExactAlg {
  value: string;
  add_y: boolean;
  new: boolean; // add this field when adding new algs. Makes verification easier.
  step: string;
}

export const rawGeneric = generic as unknown as ExactAlg[];
export const rawOLLalgs = OLL as unknown as string[];
export const rawOLLrightyAlgs = OLLrighty as unknown as string[];
export const rawOLLleftyAlgs = OLLlefty as unknown as string[];
export const rawPLLalgs = PLL as unknown as string[];
export const rawPLLrightyAlgs = PLLrighty as unknown as string[];
export const rawPLLleftyAlgs = PLLlefty as unknown as string[];
export const rawZBLLalgs = ZBLL as unknown as string[];
export const rawZBLLrightyAlgs = ZBLLrighty as unknown as string[];
export const rawZBLLleftyAlgs = ZBLLlefty as unknown as string[];
