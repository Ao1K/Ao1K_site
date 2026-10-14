import { chromium } from 'playwright-core';

const SCRAMBLE = "U B2 D2 L2 B' D2 B U2 B' R2 B D2 F' L U L2 B2 F' U2 R U'";
const SOLUTION = [
  "x' B' D' R F' D2",
  "y' R' U2 R2 U R'",
  "y' R U2 R'",
  "F' L F L' U2 S L' U' L S'",
  "R D' R' U R D R'",
  "R U2 R' U2 L' U R U' R' L"
].join('\n');

const ESBUILD_KEEP_NAMES_SHIM = 'globalThis.__name = globalThis.__name || ((target) => target);';

async function main() {
  const port = process.argv[2] ?? '3123';
  const gl = process.argv[3] ?? 'gpu';
  const runs = Number(process.argv[4] ?? 2);
  const args = gl === 'swiftshader'
    ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-features=Vulkan'];
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await context.addInitScript(ESBUILD_KEEP_NAMES_SHIM);
  await context.addCookies([{ name: 'infoPanelDismissed_v1', value: 'true', url: `http://localhost:${port}` }]);
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGEERROR', err.message));

  const url = `http://localhost:${port}/recon?scramble=${encodeURIComponent(SCRAMBLE)}&solution=${encodeURIComponent(SOLUTION)}`;
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  const glInfo = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('webgl2') as WebGL2RenderingContext;
    const ext = c.getExtension('WEBGL_debug_renderer_info');
    return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log('renderer:', glInfo);
  const rafHz = await page.evaluate(() => new Promise<number>(resolve => {
    let n = 0; const start = performance.now();
    const tick = () => { n++; if (n < 60) requestAnimationFrame(tick); else resolve(n / ((performance.now() - start) / 1000)); };
    requestAnimationFrame(tick);
  }));
  console.log('rAF Hz:', rafHz.toFixed(1));

  await page.locator('#copy-solve-dropdown > button').dispatchEvent('click');
  await page.getByText('Create GIF').dispatchEvent('click');
  const download = page.getByRole('button', { name: 'Download GIF' });
  await download.waitFor({ timeout: 60000 });
  await page.waitForTimeout(3000);
  if (process.env.PRESET) {
    await page.getByRole('button', { name: process.env.PRESET, exact: true }).click();
    console.log('preset:', process.env.PRESET);
  }

  const cdp = await context.newCDPSession(page);
  for (let i = 0; i < runs; i++) {
    const profiling = process.env.PROFILE_RUN === String(i);
    if (profiling) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
      await cdp.send('Profiler.start');
    }
    await page.evaluate(() => {
      const w = window as any;
      w.__paints = [];
      w.__watchingPaints = true;
      const onFrame = (time: number) => {
        const button = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Generating'));
        if (button) w.__paints.push({ time, label: button.textContent });
        if (w.__watchingPaints) requestAnimationFrame(onFrame);
      };
      requestAnimationFrame(onFrame);
    });
    const start = performance.now();
    const [file] = await Promise.all([
      page.waitForEvent('download', { timeout: 300000 }),
      download.click(),
    ]);
    console.log(`run ${i}: ${((performance.now() - start) / 1000).toFixed(2)}s`);
    const paints = await page.evaluate(() => {
      const w = window as any;
      w.__watchingPaints = false;
      return w.__paints as { time: number; label: string }[];
    });
    const gaps = paints.slice(1).map((paint, k) => paint.time - paints[k].time);
    console.log(
      `paints while generating: ${paints.length}, distinct labels painted: ${new Set(paints.map(p => p.label)).size}, ` +
      `longest gap between paints: ${Math.max(0, ...gaps).toFixed(0)}ms`,
    );
    if (profiling) {
      const { profile } = await cdp.send('Profiler.stop');
      const selfTime = new Map<string, number>();
      const byId = new Map(profile.nodes.map(n => [n.id, n]));
      const counts = new Map<number, number>();
      for (const id of profile.samples ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
      for (const [id, count] of counts) {
        const node = byId.get(id)!;
        const f = node.callFrame;
        const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`;
        selfTime.set(key, (selfTime.get(key) ?? 0) + count);
      }
      const total = profile.samples?.length ?? 1;
      [...selfTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
        .forEach(([k, v]) => console.log(`${(100 * v / total).toFixed(1)}%  ${k}`));
    }
    const out = `${process.env.OUT_DIR ?? '.'}/bench-${gl}-${i}.gif`;
    await file.saveAs(out);
    console.log('saved', out);
    await page.waitForTimeout(1000);
  }
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
