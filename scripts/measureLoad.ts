import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';

type MilestoneMap = Record<string, string>;

type RunResult = {
  ttfb: number | null;
  domContentLoaded: number | null;
  load: number | null;
  fcp: number | null;
  lcp: number | null;
  tbt: number | null;
  longestTask: number | null;
  milestones: Record<string, number | null>;
  transferBytes: Record<string, number>;
  scripts: { url: string; transfer: number; decoded: number; duration: number }[];
};

type Report = {
  label: string;
  url: string;
  runs: number;
  cache: 'cold' | 'warm';
  cpuThrottle: number;
  network: string;
  viewport: string;
  cookies: string;
  recordedAt: string;
  results: RunResult[];
  medians: Record<string, number | null>;
};

const ESBUILD_KEEP_NAMES_SHIM = 'globalThis.__name = globalThis.__name || ((target) => target);';

const NETWORK_PRESETS: Record<string, { downloadKbps: number; uploadKbps: number; latencyMs: number } | null> = {
  none: null,
  fast3g: { downloadKbps: 1600, uploadKbps: 750, latencyMs: 150 },
  slow4g: { downloadKbps: 3000, uploadKbps: 1500, latencyMs: 100 },
  cable: { downloadKbps: 20000, uploadKbps: 5000, latencyMs: 20 },
};

const TARGET_STATE_COOKIES_BY_PATH: Record<string, Record<string, string>> = {
  '/recon': { infoPanelDismissed_v1: 'true' },
};

const MILESTONES_BY_PATH: Record<string, MilestoneMap> = {
  '/recon': {
    contentRendered: '#cube_model',
    editorReady: '#scramble [contenteditable]',
    cubeCanvas: '#cube_model canvas',
  },
  '/algs': {
    contentRendered: 'main',
  },
  '/notimer': {
    contentRendered: 'main',
  },
};

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      args[token.slice(2, eq)] = token.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      args[token.slice(2)] = next && !next.startsWith('--') ? (i++, next) : 'true';
    }
  }
  return args;
}

function findChrome(): string {
  const found = CHROME_CANDIDATES.find((path) => path && existsSync(path));
  if (!found) {
    throw new Error('No Chrome binary found. Set CHROME_PATH to a Chrome or Chromium executable.');
  }
  return found;
}

function pathOf(url: string): string {
  return new URL(url).pathname.replace(/\/+$/, '') || '/';
}

function milestonesFor(url: string): MilestoneMap {
  return MILESTONES_BY_PATH[pathOf(url)] ?? { contentRendered: 'main' };
}

function cookiesFor(url: string, override: string | undefined) {
  const target = new URL(url);
  const pairs =
    override === undefined
      ? TARGET_STATE_COOKIES_BY_PATH[pathOf(url)] ?? {}
      : override === 'none'
        ? {}
        : Object.fromEntries(override.split(',').map((pair) => pair.split('=') as [string, string]));
  return Object.entries(pairs).map(([name, value]) => ({
    name,
    value,
    domain: target.hostname,
    path: '/',
  }));
}

function warnIfOffTarget(url: string, cookies: { name: string }[]) {
  const required = Object.keys(TARGET_STATE_COOKIES_BY_PATH[pathOf(url)] ?? {});
  const missing = required.filter((name) => !cookies.some((cookie) => cookie.name === name));
  if (missing.length === 0) return;
  console.warn(
    `warning: missing ${missing.join(', ')}. On ${pathOf(url)} that leaves the info panel open, ` +
      `which pushes the cube below the fold and is not what this branch is optimizing.`
  );
}

function parseViewport(value: string) {
  const [width, height] = value.split('x').map(Number);
  if (!width || !height) throw new Error(`Bad --viewport ${value}. Use WIDTHxHEIGHT, e.g. 1440x900.`);
  return { width, height };
}

function median(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (present.length === 0) return null;
  const middle = Math.floor(present.length / 2);
  return present.length % 2 === 1 ? present[middle] : (present[middle - 1] + present[middle]) / 2;
}

function installProbe(milestones: MilestoneMap) {
  const probe = {
    milestones: {} as Record<string, number>,
    fcp: null as number | null,
    lcp: null as number | null,
    longTasks: [] as number[],
    pending: Object.entries(milestones),
  };
  (window as any).__loadProbe = probe;

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') probe.fcp = entry.startTime;
      }
    }).observe({ type: 'paint', buffered: true });
  } catch {}

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      probe.lcp = entries[entries.length - 1].startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) probe.longTasks.push(entry.duration);
    }).observe({ type: 'longtask', buffered: true });
  } catch {}

  const poll = () => {
    probe.pending = probe.pending.filter(([name, selector]) => {
      const element = document.querySelector(selector);
      if (!element) return true;
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return true;
      probe.milestones[name] = performance.now();
      return false;
    });
    if (probe.pending.length > 0) requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}

async function measureOnce(
  browser: Browser,
  url: string,
  milestones: MilestoneMap,
  options: {
    cache: 'cold' | 'warm';
    cpuThrottle: number;
    network: string;
    timeoutMs: number;
    viewport: { width: number; height: number };
    cookies: { name: string; value: string; domain: string; path: string }[];
  },
  reuse: BrowserContext | null
): Promise<{ result: RunResult; context: BrowserContext }> {
  const context = reuse ?? (await browser.newContext({ viewport: options.viewport }));
  if (!reuse && options.cookies.length) await context.addCookies(options.cookies);
  const page: Page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  if (options.cpuThrottle > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.cpuThrottle });
  }
  const preset = NETWORK_PRESETS[options.network];
  if (preset) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: preset.latencyMs,
      downloadThroughput: (preset.downloadKbps * 1000) / 8,
      uploadThroughput: (preset.uploadKbps * 1000) / 8,
    });
  }
  if (options.cache === 'cold') {
    await cdp.send('Network.clearBrowserCache');
  }

  await page.addInitScript({ content: ESBUILD_KEEP_NAMES_SHIM });
  await page.addInitScript(installProbe, milestones);
  await page.goto(url, { waitUntil: 'load', timeout: options.timeoutMs });

  const names = Object.keys(milestones);
  await page
    .waitForFunction(
      (expected: string[]) => {
        const probe = (window as any).__loadProbe;
        return Boolean(probe) && expected.every((name) => name in probe.milestones);
      },
      names,
      { timeout: options.timeoutMs }
    )
    .catch((error) => {
      console.warn(`  milestone wait failed: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
    });

  const result = await page.evaluate((expected: string[]) => {
    const probe = (window as any).__loadProbe;
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const lastMilestone = Math.max(0, ...expected.map((name) => probe.milestones[name] ?? 0));
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const transferBytes: Record<string, number> = {};
    for (const entry of resources) {
      const kind = entry.initiatorType || 'other';
      transferBytes[kind] = (transferBytes[kind] ?? 0) + entry.transferSize;
    }

    const scripts = resources
      .filter((entry) => entry.initiatorType === 'script' || entry.name.endsWith('.js'))
      .map((entry) => ({
        url: entry.name,
        transfer: entry.transferSize,
        decoded: entry.decodedBodySize,
        duration: entry.duration,
      }))
      .sort((a, b) => b.transfer - a.transfer)
      .slice(0, 12);

    return {
      ttfb: nav ? nav.responseStart : null,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
      load: nav ? nav.loadEventEnd : null,
      fcp: probe.fcp,
      lcp: probe.lcp,
      tbt: probe.longTasks.reduce((total: number, duration: number) => total + Math.max(0, duration - 50), 0),
      longestTask: probe.longTasks.length ? Math.max(...probe.longTasks) : 0,
      milestones: Object.fromEntries(expected.map((name) => [name, probe.milestones[name] ?? null])),
      transferBytes,
      scripts,
      lastMilestone,
    };
  }, names);

  await page.close();
  return { result, context };
}

function formatMs(value: number | null): string {
  return value === null ? '   --  ' : `${value.toFixed(0).padStart(5)}ms`;
}

function summarize(results: RunResult[], milestoneNames: string[]): Record<string, number | null> {
  const summary: Record<string, number | null> = {
    ttfb: median(results.map((run) => run.ttfb)),
    fcp: median(results.map((run) => run.fcp)),
    lcp: median(results.map((run) => run.lcp)),
    domContentLoaded: median(results.map((run) => run.domContentLoaded)),
    load: median(results.map((run) => run.load)),
    tbt: median(results.map((run) => run.tbt)),
    longestTask: median(results.map((run) => run.longestTask)),
  };
  for (const name of milestoneNames) {
    summary[name] = median(results.map((run) => run.milestones[name] ?? null));
  }
  summary.totalTransferKB = median(
    results.map((run) => Object.values(run.transferBytes).reduce((total, bytes) => total + bytes, 0) / 1024)
  );
  summary.scriptTransferKB = median(results.map((run) => (run.transferBytes.script ?? 0) / 1024));
  return summary;
}

async function waitForServer(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`No server responded at ${url}. Start one with: pnpm build && pnpm start`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = args.url ?? 'http://localhost:3000/recon';
  const runs = Number(args.runs ?? 5);
  const cache = (args.cache ?? 'cold') as 'cold' | 'warm';
  const cpuThrottle = Number(args.cpu ?? 1);
  const network = args.network ?? 'none';
  const timeoutMs = Number(args.timeout ?? 45000);
  const label = args.label ?? 'run';
  const viewport = parseViewport(args.viewport ?? '1440x900');
  const cookies = cookiesFor(url, args.cookies);
  warnIfOffTarget(url, cookies);

  if (!(network in NETWORK_PRESETS)) {
    throw new Error(`Unknown --network ${network}. Options: ${Object.keys(NETWORK_PRESETS).join(', ')}`);
  }

  await waitForServer(url, 20000);

  const milestones = milestonesFor(url);
  const milestoneNames = Object.keys(milestones);
  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const results: RunResult[] = [];
  let sharedContext: BrowserContext | null = null;
  try {
    for (let i = 0; i < runs; i++) {
      const { result, context } = await measureOnce(
        browser,
        url,
        milestones,
        { cache, cpuThrottle, network, timeoutMs, viewport, cookies },
        cache === 'warm' ? sharedContext : null
      );
      if (cache === 'warm') {
        sharedContext = context;
      } else {
        await context.close();
      }
      results.push(result);
      const cube = milestoneNames.map((name) => `${name} ${formatMs(result.milestones[name])}`).join('  ');
      console.log(`run ${i + 1}/${runs}  ttfb ${formatMs(result.ttfb)}  fcp ${formatMs(result.fcp)}  ${cube}`);
    }
  } finally {
    await browser.close();
  }

  const medians = summarize(results, milestoneNames);
  const report: Report = {
    label,
    url,
    runs,
    cache,
    cpuThrottle,
    network,
    viewport: `${viewport.width}x${viewport.height}`,
    cookies: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join(',') || 'none',
    recordedAt: new Date().toISOString(),
    results,
    medians,
  };

  console.log(`\nmedians over ${runs} runs  (${url}, cache=${cache}, cpu=${cpuThrottle}x, network=${network}, viewport=${report.viewport}, cookies=${report.cookies})`);
  for (const [name, value] of Object.entries(medians)) {
    const unit = name.endsWith('KB') ? `${value === null ? '--' : value.toFixed(0)} KB` : formatMs(value);
    console.log(`  ${name.padEnd(18)} ${unit}`);
  }

  const heaviest = results[0].scripts.slice(0, 8);
  if (heaviest.length) {
    console.log('\nheaviest scripts (run 1)');
    for (const script of heaviest) {
      const name = script.url.replace(/^https?:\/\/[^/]+/, '');
      console.log(`  ${(script.transfer / 1024).toFixed(0).padStart(6)} KB  ${name}`);
    }
  }

  if (args.baseline) {
    const baseline = JSON.parse(readFileSync(resolve(args.baseline), 'utf8')) as Report;
    console.log(`\nvs baseline ${baseline.label} (${baseline.recordedAt})`);
    for (const [name, value] of Object.entries(medians)) {
      const before = baseline.medians[name];
      if (before === null || before === undefined || value === null) continue;
      const delta = value - before;
      const sign = delta >= 0 ? '+' : '';
      const unit = name.endsWith('KB') ? 'KB' : 'ms';
      console.log(`  ${name.padEnd(18)} ${before.toFixed(0)} -> ${value.toFixed(0)} ${unit}  (${sign}${delta.toFixed(0)})`);
    }
  }

  if (args.json) {
    const outPath = resolve(args.json);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\nsaved ${outPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
