
import { rawGeneric, rawOLLalgs, rawPLLalgs } from '../utils/rawAlgs';
import * as fs from 'fs';
import * as path from 'path';

const formatAlg = (alg: any): string => {
  // Stringify the object to JSON, then remove quotes around keys to make it look like TS object literal
  // Also ensure it's on one line and add spaces after commas
  return '  ' + JSON.stringify(alg)
    .replace(/"(\w+)":/g, '$1: ')
    .replace(/,/g, ', ') + ',';
};

const sortAndFormat = (algs: any[], varName: string, typeName: string): string => {
  const sorted = [...algs].sort((a, b) => a.value.localeCompare(b.value));
  const lines = sorted.map(formatAlg);
  return `export const ${varName}: ${typeName}[] = [\n${lines.join('\n')}\n];`;
};

async function main() {
  try {
    const generic = sortAndFormat(rawGeneric, 'rawGeneric', 'ExactAlg');
    const oll = sortAndFormat(rawOLLalgs, 'rawOLLalgs', 'LastLayerAlg');
    const pll = sortAndFormat(rawPLLalgs, 'rawPLLalgs', 'LastLayerAlg');

    const content = `import { ExactAlg, LastLayerAlg } from './rawAlgs';\n\n${generic}\n\n${oll}\n\n${pll}\n`;
    
    const outputPath = path.join(process.cwd(), 'utils', 'sortedRawAlgs.tsx');
    fs.writeFileSync(outputPath, content);
    console.log(`Sorted algs written to ${outputPath}`);
  } catch (error) {
    console.error('Error sorting algs:', error);
    process.exit(1);
  }
}

main();
