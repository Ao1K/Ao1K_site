
import { rawGeneric, rawOLLalgs, rawPLLalgs, rawZBLLalgs } from '../utils/rawAlgs';
import type { ExactAlg } from '../utils/rawAlgs';
import * as fs from 'fs';
import * as path from 'path';

const sortExact = (algs: ExactAlg[]): ExactAlg[] => [...algs].sort((a, b) => a.value.localeCompare(b.value));
const sortValues = (algs: string[]): string[] => [...algs].sort((a, b) => a.localeCompare(b));

async function main() {
  try {
    const utilsPath = path.join(process.cwd(), 'utils');
    fs.writeFileSync(path.join(utilsPath, 'rawGenericData.json'), JSON.stringify(sortExact(rawGeneric), null, 2));
    fs.writeFileSync(path.join(utilsPath, 'rawOLLdata.json'), JSON.stringify(sortValues(rawOLLalgs), null, 2));
    fs.writeFileSync(path.join(utilsPath, 'rawPLLdata.json'), JSON.stringify(sortValues(rawPLLalgs), null, 2));
    fs.writeFileSync(path.join(utilsPath, 'rawZBLLdata.json'), JSON.stringify(sortValues(rawZBLLalgs), null, 2));
    console.log('Sorted algs written to utils/rawGenericData.json, rawOLLdata.json, rawPLLdata.json, rawZBLLdata.json');
  } catch (error) {
    console.error('Error sorting algs:', error);
    process.exit(1);
  }
}

main();
