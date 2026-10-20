import * as fs from 'fs';
import * as path from 'path';

const LETTERS = ['U', 'D', 'R', 'L', 'F', 'B'];
const OUT = path.join(process.cwd(), 'utils', 'cubeLabelGlyphs.ts');

function readGlyph(letter: string): { width: number; height: number; d: string } {
  const svg = fs.readFileSync(path.join(process.cwd(), 'public', `${letter}.svg`), 'utf8');
  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const glyph = /<path d="([^"]+)"/.exec(svg);
  if (!viewBox || !glyph) throw new Error(`${letter}.svg has no viewBox or path`);
  return { width: Number(viewBox[1]), height: Number(viewBox[2]), d: glyph[1] };
}

function main() {
  const glyphs = LETTERS.map(letter => ({ letter, ...readGlyph(letter) }));
  const { width, height } = glyphs[0];
  const mismatched = glyphs.find(g => g.width !== width || g.height !== height);
  if (mismatched) throw new Error(`${mismatched.letter}.svg has a different viewBox`);

  const entries = glyphs.map(g => `  ${g.letter}: '${g.d}',`).join('\n');
  const source = `export const LABEL_GLYPH_BOX = { width: ${width}, height: ${height} }\n\n`
    + `export const LABEL_GLYPHS: Record<string, string> = {\n${entries}\n}\n`;
  fs.writeFileSync(OUT, source);
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
}

main();
