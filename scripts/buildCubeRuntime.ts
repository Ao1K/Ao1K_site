import * as esbuild from 'esbuild';
import * as path from 'path';

const OUT = path.join(process.cwd(), 'public', 'learn', 'cubeScene.js');

async function main() {
  const result = await esbuild.build({
    entryPoints: [path.join(process.cwd(), 'utils', 'cubeSceneEntry.client.ts')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2018'],
    outfile: OUT,
    legalComments: 'none',
    metafile: true,
  });

  const bytes = Object.values(result.metafile.outputs)[0].bytes;
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${bytes} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
