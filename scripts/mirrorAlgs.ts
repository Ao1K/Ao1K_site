import * as fs from 'fs';
import * as path from 'path';
import { cube3x3 } from '../utils/parser/cube3x3';
import type { Move3x3 } from '../utils/parser/cube3x3';
import frequentLeftAlgs from '../utils/frequentLeftAlgs.json';

type AlgEntry = string | { value: string; [key: string]: unknown };

type FrequentLeftTable = Record<string, { frequentLefty: string[] } | undefined>;

const getValue = (entry: AlgEntry): string => typeof entry === 'string' ? entry : entry.value;

const withValue = (entry: AlgEntry, value: string): AlgEntry =>
  typeof entry === 'string' ? value : { ...entry, value };

const parseAlg = (alg: string): Move3x3[] => {
  const { moves, invalid } = cube3x3.parse(alg);
  if (invalid.length > 0) {
    throw new Error(`Unsupported move "${invalid.join('", "')}" in alg "${alg}"`);
  }
  return moves;
};

const mirrorAlg = (alg: string): string => cube3x3.format(cube3x3.mirror(parseAlg(alg), 'M'));

const isRighty = (alg: string): boolean => parseAlg(alg).every((move) => {
  const layer = cube3x3.layer(move);
  return layer !== 'L' && layer !== 'l';
});

const normalizeAlg = (alg: string): string => cube3x3.format(cube3x3.normalize(parseAlg(alg)));

const dedupe = (entries: AlgEntry[]): AlgEntry[] => {
  const seen = new Set<string>();
  const unique: AlgEntry[] = [];
  entries.forEach((entry) => {
    const key = normalizeAlg(getValue(entry));
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(entry);
  });
  return unique;
};

const sortEntries = (entries: AlgEntry[]): AlgEntry[] =>
  [...entries].sort((a, b) => getValue(a).localeCompare(getValue(b)));

const getStepFromFileName = (base: string): string | null => {
  const match = /^raw(.+)data$/i.exec(base);
  return match ? match[1].toLowerCase() : null;
};

const getFrequentLeftyAlgs = (step: string | null): string[] => {
  if (!step) return [];
  return (frequentLeftAlgs as FrequentLeftTable)[step]?.frequentLefty ?? [];
};

function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error('Usage: npx tsx scripts/mirrorAlgs.ts <path/to/rawZBLLdata.json>');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const entries = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as AlgEntry[];

  if (!Array.isArray(entries)) {
    console.error('Input file must contain an array of algs');
    process.exit(1);
  }

  const righty: AlgEntry[] = [];
  const lefty: AlgEntry[] = [];
  let flipped = 0;
  let mixed = 0;

  entries.forEach((entry) => {
    const alg = getValue(entry);
    const mirrored = mirrorAlg(alg);
    const mirroredEntry = withValue(entry, mirrored);

    if (isRighty(alg)) {
      righty.push(entry);
      lefty.push(mirroredEntry);
    } else if (isRighty(mirrored)) {
      flipped++;
      righty.push(mirroredEntry);
      lefty.push(entry);
    } else {
      mixed++;
      righty.push(entry, mirroredEntry);
      lefty.push(entry, mirroredEntry);
    }
  });

  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, '.json');

  const frequentLefty = getFrequentLeftyAlgs(getStepFromFileName(base));
  frequentLefty.forEach((alg) => {
    righty.push(alg);
    lefty.push(mirrorAlg(alg));
  });

  const uniqueRighty = sortEntries(dedupe(righty));
  const uniqueLefty = sortEntries(dedupe(lefty));

  const rightyPath = path.join(dir, `${base}_righty.json`);
  const leftyPath = path.join(dir, `${base}_lefty.json`);

  fs.writeFileSync(rightyPath, JSON.stringify(uniqueRighty, null, 2));
  fs.writeFileSync(leftyPath, JSON.stringify(uniqueLefty, null, 2));

  console.log(`Read ${entries.length} algs from ${inputPath}`);
  console.log(`Converted ${flipped} lefty algs to righty`);
  if (frequentLefty.length > 0) {
    console.log(`Added ${frequentLefty.length} frequent lefty algs to the righty list, and their mirrors to the lefty list`);
  }
  if (mixed > 0) console.log(`${mixed} algs use both sides and were added to both lists in both orientations`);
  console.log(`Wrote ${uniqueRighty.length} algs to ${rightyPath} (${righty.length - uniqueRighty.length} duplicates removed)`);
  console.log(`Wrote ${uniqueLefty.length} algs to ${leftyPath} (${lefty.length - uniqueLefty.length} duplicates removed)`);
}

main();
