import * as fs from 'fs';
import * as path from 'path';
import { rawGeneric } from '../utils/rawAlgs';
import type { ExactAlg } from '../utils/rawAlgs';
import { collapseAufGroups } from '../utils/collapseAufVariants';

function formatAlg(alg: ExactAlg): string {
  const entries = Object.entries(alg).map(([key, value]) => `"${key}": ${JSON.stringify(value)}`);
  return `{ ${entries.join(', ')} }`;
}

function main() {
  const collapsed = collapseAufGroups(rawGeneric as ExactAlg[]);

  const output = `[\n  ${collapsed.map(formatAlg).join(',\n  ')}\n]\n`;

  const outputPath = path.join(process.cwd(), 'utils', 'rawGenericData.json');
  fs.writeFileSync(outputPath, output, 'utf-8');

  console.log(`Collapsed ${rawGeneric.length} algs down to ${collapsed.length} in utils/rawGenericData.json`);
}

main();
