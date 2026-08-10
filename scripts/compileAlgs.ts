import * as fs from 'fs';
import * as path from 'path';
import { compileAlgs, ALGORITHM_TYPES, type AlgorithmType, type EmittedFile } from '../utils/algCompilerCore';

const COMPILED_DIR = path.join(process.cwd(), 'public', 'recon');
const SIDE_OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');

const outputPathFor = (file: EmittedFile): string => {
  switch (file.kind) {
    case 'compiled':
      return path.join(COMPILED_DIR, `compiled-${file.label}-algs.json`);
    case 'newAlgs':
      return path.join(SIDE_OUTPUT_DIR, `new_${file.label}_algs.json`);
    case 'repairedRaw':
      return path.join(SIDE_OUTPUT_DIR, `repaired-${file.label}-algs.json`);
  }
};

const parseTypes = (args: string[]): AlgorithmType[] => {
  const requested = args.filter(arg => !arg.startsWith('-'));
  if (requested.length === 0 || requested.includes('all')) {
    return [...ALGORITHM_TYPES];
  }

  const unknown = requested.filter(arg => !ALGORITHM_TYPES.includes(arg as AlgorithmType));
  if (unknown.length > 0) {
    console.error(`Unknown algorithm type(s): ${unknown.join(', ')}`);
    console.error(`Valid types: ${ALGORITHM_TYPES.join(', ')}, all`);
    process.exit(1);
  }

  return requested as AlgorithmType[];
};

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const types = parseTypes(args);

  console.log(`Compiling: ${types.join(', ')}${dryRun ? ' (dry run)' : ''}`);

  const written: string[] = [];

  compileAlgs({
    types,
    emit: (file) => {
      const outputPath = outputPathFor(file);
      if (dryRun) {
        console.log(`Would write ${outputPath}`);
        return;
      }
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, file.contents);
      written.push(outputPath);
    },
  });

  if (written.length === 0) {
    console.log('No files written.');
    return;
  }

  written.forEach(outputPath => console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`));
}

main();
