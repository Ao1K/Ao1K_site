// TO USE:
// 1. Add new algs to the appropriate JSON data file (rawGenericData.json, rawOLLdata.json, rawPLLdata.json).
// 2. Add the "new": false field to the alg object.
// 3. Go to _PageContent and uncomment the AlgCompiler component.
// 4. `npm run dev`, select algorithm types, and run the tool.

// cast as unknown to avoid TypeScript inferring huge literal union types from JSON
import generic from './rawGenericData.json';
import OLL from './rawOLLdata.json';
import PLL from './rawPLLdata.json';

export interface ExactAlg {
  value: string;
  add_y: boolean;
  add_U: boolean;
  name: string;
  new: boolean; // add this field when adding new algs. Makes verification easier.
  step: string;
}

export interface LastLayerAlg {
  value: string;
  step: string;
  new?: boolean; // add this field when adding new algs. Makes verification easier.
}

export interface ZBLSalg extends LastLayerAlg {
  eoIndex: number;
}

export const rawGeneric = generic as unknown as ExactAlg[];
export const rawOLLalgs = OLL as unknown as LastLayerAlg[];
export const rawPLLalgs = PLL as unknown as LastLayerAlg[];
