
import { rawGeneric, rawOLLalgs, rawPLLalgs } from '../utils/rawAlgs';
import * as fs from 'fs';
import * as path from 'path';

const sort = (algs: any[]): any[] => [...algs].sort((a, b) => a.value.localeCompare(b.value));

async function main() {
  try {
    const utilsPath = path.join(process.cwd(), 'utils');
    fs.writeFileSync(path.join(utilsPath, 'rawGenericData.json'), JSON.stringify(sort(rawGeneric), null, 2));
    fs.writeFileSync(path.join(utilsPath, 'rawOLLdata.json'), JSON.stringify(sort(rawOLLalgs), null, 2));
    fs.writeFileSync(path.join(utilsPath, 'rawPLLdata.json'), JSON.stringify(sort(rawPLLalgs), null, 2));
    console.log('Sorted algs written to utils/rawGenericData.json, rawOLLdata.json, rawPLLdata.json');
  } catch (error) {
    console.error('Error sorting algs:', error);
    process.exit(1);
  }
}

main();
