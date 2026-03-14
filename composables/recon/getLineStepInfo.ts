import type { StepInfo, LSEPattern } from './SimpleCubeInterpreter';
import type { Grid } from './LLinterpreter';

const getCFOPStep = (currentSteps: StepInfo[], prevSteps: StepInfo[], prevGridPattern?: Grid): StepInfo | null => {
    // Check for complex LL combinations
  const llSteps = currentSteps.filter(step => step.type === 'last layer');
  const llStepNames = llSteps.map(s => s.step);
  const prevLLStepNames = prevSteps.filter(step => step.type === 'last layer').map(s => s.step);
  const f2lSteps = currentSteps.filter(step => step.type === 'f2l');
  const crossSteps = currentSteps.filter(step => step.type === 'cross');

  // get most recent name from previous steps (flows forward like prevGridPattern)
  let prevName: string | undefined = undefined;
  let prevNameType: 'oll' | 'pll' | undefined = undefined;
  for (let i = prevSteps.length - 1; i >= 0; i--) {
    if (prevSteps[i].name) {
      prevName = prevSteps[i].name;
      prevNameType = prevSteps[i].nameType;
      break;
    }
  }

  // for now, treat f2l + ll as just f2l

  // xcross, xxcross, etc
  if (crossSteps.length === 1 && f2lSteps.length > 0) {
    const colors = [...crossSteps[0].colors]; // first color is always cross
    colors.push(...f2lSteps.flatMap(step => step.colors));
    return { step: "x".repeat(f2lSteps.length) + 'cross', type: 'cross', colors: colors };
  }

  // F2L pairs
  if (f2lSteps.length > 1) {
    const uniqueColors = [...new Set(f2lSteps.flatMap(step => step.colors))];
    const f2lSlotList = f2lSteps.flatMap(step => step.f2lSlotList || []);
    return { step: 'multislot', type: 'f2l', colors: uniqueColors, f2lSlotList };
  } else if (f2lSteps.length === 1) {
    // fails to distinguish f2l from zbls.
    // OLS is caught by the llSteps check above.
    return { step: 'pair', type: 'f2l', colors: [...new Set([...f2lSteps[0].colors])], f2lSlotList: f2lSteps[0].f2lSlotList };
  }

  if (llStepNames.includes('ep') && llStepNames.includes('cp') && llStepNames.includes('co') && llStepNames.includes('eo')) {
    console.log('1lll')
    return { step: '1lll', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern, name: prevName, nameType: prevNameType };
  }
  if (llStepNames.includes('ep') && llStepNames.includes('cp') && llStepNames.includes('co')) {
    return { step: 'zbll', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern };
  }
  if (llStepNames.includes('eo') && llStepNames.includes('cp') && llStepNames.includes('co')) {
    return { step: 'oll(cp)', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern, ...(prevNameType === 'oll' ? { name: prevName, nameType: prevNameType } : {}) };
  }
  if (llStepNames.includes('eo') && llStepNames.includes('co')) {
    return { step: 'oll', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern, ...(prevNameType === 'oll' ? { name: prevName, nameType: prevNameType } : {}) };
  }
  if (llStepNames.includes('ep') && llStepNames.includes('cp')) {
    return { step: 'pll', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern, ...(prevNameType === 'pll' ? { name: prevName, nameType: prevNameType } : {}) };
  }
  if (llStepNames.includes('co') && llStepNames.includes('cp') && prevLLStepNames.includes('eo')) {
    return { step: 'coll', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern };
  }
  if (llStepNames.includes('eo') && llStepNames.includes('ep')) {
    return { step: 'ell', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern };
  }
  if (llStepNames.includes('co') && llStepNames.includes('cp')) {
    return { step: 'cll', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern };
  }
  if (llStepNames.includes('eo') && prevLLStepNames.includes('co')) {
    return { step: 'oll', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern, ...(prevNameType === 'oll' ? { name: prevName, nameType: prevNameType } : {}) };
  }
  if (llStepNames.includes('co') && prevLLStepNames.includes('eo')) {
    return { step: 'oll', type: 'last layer', colors: llSteps[0]?.colors || [], gridPattern: prevGridPattern, ...(prevNameType === 'oll' ? { name: prevName, nameType: prevNameType } : {}) };
  }

  // Individual LL steps
  if(currentSteps.length === 1 && llSteps.length === 1) {
    const step = llSteps[0];
    if (step.step === 'eo') return { step: '1st look oll', type: 'last layer', colors: step.colors, gridPattern: prevGridPattern };
    if (step.step === 'co') return { step: '2nd look oll', type: 'last layer', colors: step.colors, gridPattern: prevGridPattern };
    if (step.step === 'cp') return { step: '1st look pll', type: 'last layer', colors: step.colors, gridPattern: prevGridPattern };
    if (step.step === 'ep') return { step: '2nd look pll', type: 'last layer', colors: step.colors, gridPattern: prevGridPattern };
  }

  if (currentSteps.some(step => step.type === 'solved')) {
    
    const prevF2LSteps = prevSteps.filter(step => step.type === 'f2l');
    
    // someone just did some crazy shit
    if (prevF2LSteps.length < 4 && prevF2LSteps.length > 0) {
      return { step: 'owl', type: 'solved', colors: currentSteps[0].colors, gridPattern: prevGridPattern };
    }


    return { 
      step: 'solved', 
      type: 'solved', 
      colors: currentSteps[0].colors, 
      gridPattern: prevGridPattern,

      // TODO: add support for other steps names
      // In SimpleCubeInterpreter, stop just returning 'solved' as step. 
      // Would need this richer data.
      ...(prevNameType === 'pll' ? { name: prevName, nameType: prevNameType } : {}) };
  }

  // Cross
  if (crossSteps.length > 0) return crossSteps[crossSteps.length - 1]; // Return the last cross step

  return null;
}

const getRouxStep = (currentSteps: StepInfo[], prevSteps: StepInfo[], prevLSEPattern?: LSEPattern, prevGridPattern?: Grid): StepInfo | null => {
  const cmllSteps = currentSteps.filter(step => step.type === 'cmll');
  const cmllStepNames = cmllSteps.map(s => s.step);
  const prevCmllSteps = prevSteps.filter(step => step.type === 'cmll').map(s => s.step);
  const lseSteps = currentSteps.filter(step => step.type === 'lse');
  const blockSteps = currentSteps.filter(step => step.type === 'block');

  // check solved case
  if (currentSteps.some(step => step.type === 'solved')) {
    return { step: 'solved', type: 'lse', colors: currentSteps[0].colors, lsePattern: prevLSEPattern };
  }

  // LSE combinations (highest priority after solved)
  if (prevCmllSteps.includes('co') && prevCmllSteps.includes('cp') && lseSteps.length > 0) {
    return { step: 'lse', type: 'lse', colors: [], lsePattern: prevLSEPattern };
  }

  // block building - return the most advanced block on this line
  // it's very unlikely someone combines block building with cmll, 
  // so blocks take priority over cmll 
  if (blockSteps.length > 0) {
    return blockSteps[blockSteps.length - 1];
  }

  // CMLL combinations
  if (cmllStepNames.includes('co') && cmllStepNames.includes('cp')) {
    return { step: 'cmll', type: 'cmll', colors: [], gridPattern: prevGridPattern };
  }
  // cp this line, co on a previous line
  if (cmllStepNames.includes('cp') && prevCmllSteps.includes('co')) {
    return { step: 'cmll', type: 'cmll', colors: [], gridPattern: prevGridPattern };
  }
  if (cmllStepNames.includes('co')) {
    return { step: 'cmll co', type: 'cmll', colors: [], gridPattern: prevGridPattern };
  }
  if (cmllStepNames.includes('cp')) {
    return { step: 'cmll cp', type: 'cmll', colors: [], gridPattern: prevGridPattern };
  }


  return null;
}

/**
 * Uses a variety of heuristics to determine the step most likely to have been solved.
 * Works for CFOP, Roux, and ZZ.
 * Also detects whether EO was solved on this line (hasEO).
 */
export function getLineStepInfo(currentSteps: StepInfo[], prevSteps: StepInfo[]): { stepInfo: StepInfo | null; hasEO: boolean } {
  
  // get the most recent info from previous steps
  let prevGridPattern: Grid | undefined = undefined;
  let prevLSEPattern: LSEPattern | undefined = undefined;
  let prevEOvalue: number | undefined = undefined;
  for (let i = prevSteps.length - 1; i >= 0; i--) {
    if (!prevGridPattern && prevSteps[i].gridPattern) {
      prevGridPattern = prevSteps[i].gridPattern;
    }
    if (!prevLSEPattern && prevSteps[i].lsePattern) {
      prevLSEPattern = prevSteps[i].lsePattern;
    }
    const eoValue = prevSteps[i].type === 'eo' ? Number(prevSteps[i].step) : undefined;
    if (prevEOvalue === undefined && eoValue !== undefined) {
      prevEOvalue = eoValue;
    }
  }
  
  // detect if EO was solved on this line (or re-solved from a previous line)
  const currentEOStep = currentSteps.find(step => step.type === 'eo');
  const eoValue = currentEOStep !== undefined ? Number(currentEOStep.step) : undefined;
  const hasEO = eoValue === 0 && prevEOvalue !== eoValue;
  
  if (currentSteps.length === 0) return { stepInfo: null, hasEO };

  const allSteps = [...prevSteps, ...currentSteps];

  // CFOP
  const crossSteps = allSteps.filter(step => step.type === 'cross');  
  const isLikelyCFOP = // TODO: this heuristic will need to be reworked if we ever add more sophisticated ZZ steps
  (crossSteps.length > 0 && 
    allSteps.filter(step => step.type !== 'eoLine' && step.step !== 'eo' && step.type !== 'eo').length === 1)
  || (crossSteps.length > 0 &&
    allSteps.some(step => step.type === 'f2l'));
  
  if (isLikelyCFOP) {
    const cfopStep = getCFOPStep(currentSteps, prevSteps, prevGridPattern);
    if (cfopStep) return { stepInfo: cfopStep, hasEO };
  }
  
  // Roux
  const rouxBlocks = ['L-Square', 'R-Square', 'L-Block', 'R-Block'];
  const rouxBlockSteps = allSteps.filter(step => step.type === 'block' && rouxBlocks.includes(step.step));
  const cmllSteps = allSteps.filter(step => step.type === 'cmll');
  const lseSteps = allSteps.filter(step => step.type === 'lse');

  const isRoux = rouxBlockSteps.length > 0 || cmllSteps.length > 0 || lseSteps.length > 0;
  if (isRoux) {
    const rouxStep = getRouxStep(currentSteps, prevSteps, prevLSEPattern, prevGridPattern);
    if (rouxStep) return { stepInfo: rouxStep, hasEO };
  }
  
  // ZZ
  const eoLineSteps = allSteps.filter(step => step.type === 'eoLine');
  const isLikelyZZ = eoLineSteps.length > 0 && prevSteps.length === 0;

  if (isLikelyZZ) {
    return { stepInfo: eoLineSteps[eoLineSteps.length - 1], hasEO };
  }

  // Return the last step if no special handling
  return { stepInfo: currentSteps[currentSteps.length - 1], hasEO };
}
