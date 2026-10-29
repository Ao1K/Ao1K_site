import type { ExactAlg } from '../utils/rawAlgs';
import * as fs from 'fs';
import * as path from 'path';

type RawAlgEntry = string | ExactAlg;

const algValue = (entry: RawAlgEntry): string => (typeof entry === 'string' ? entry : entry.value);

const formatAlgs = (algs: RawAlgEntry[]): string => {
  const holdsExactAlgs = algs.some((entry) => typeof entry !== 'string');
  if (!holdsExactAlgs) return JSON.stringify(algs, null, 2);

  const lines = algs.map((entry) => `  ${JSON.stringify(entry)}`);
  return `[\n${lines.join(',\n')}\n]\n`;
};

function main() {
  const inputArgs = process.argv.slice(2);
  if (inputArgs.length === 0) {
    console.error('Usage: npx tsx scripts/sortAlgs.ts <path/to/rawOLLdata.json> [more raw files...]');
    process.exit(1);
  }

  for (const inputArg of inputArgs) {
    const inputPath = path.resolve(process.cwd(), inputArg);
    const algs = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as RawAlgEntry[];

    if (!Array.isArray(algs)) {
      console.error(`${inputArg} must contain an array of algs`);
      process.exit(1);
    }

    const sorted = [...algs].sort((a, b) => algValue(a).localeCompare(algValue(b)));
    fs.writeFileSync(inputPath, formatAlgs(sorted));
    console.log(`Sorted ${sorted.length} algs in ${inputArg}`);
  }
}

main();
