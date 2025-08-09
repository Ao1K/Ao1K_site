//todo: get a text file I can just paste in all the algs into, and then a script to parse them into this

export interface RawAlg {
  value: string;
  name?: string;
  step?: string;
  allowedAngles?: string[];
}

export const rawAlgs: RawAlg[] = [ 
  { value: "R U R' U' R' F R2 U' R' U' R U R' F'", name: "T", step: "pll" },
  { value: "F R U R' U' F'", name: "45", step: "oll" },
  { value: "R U R'", name: "", step: "f2l" },
]