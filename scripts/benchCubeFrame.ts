import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import path from 'node:path';

const FRAMES = Number(process.argv[2] ?? 1000);
const ROUNDS = Number(process.argv[3] ?? 9);
const CPU_THROTTLE = Number(process.argv[4] ?? 1);

async function main() {
  const bundle = await build({
    entryPoints: [path.resolve('scripts/benchCubeFrame.browser.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    jsx: 'automatic',
  });

  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('PAGEERROR', err.message));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });

  if (CPU_THROTTLE > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
  }

  const result = await page.evaluate(`window.benchCubeFrame(${FRAMES}, ${ROUNDS})`) as Record<string, number>;
  await browser.close();

  console.log(`frames=${FRAMES} rounds=${ROUNDS} cpuThrottle=${CPU_THROTTLE}x`);
  for (const [name, value] of Object.entries(result)) console.log(`${name.padEnd(18)} ${value.toFixed(1)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
