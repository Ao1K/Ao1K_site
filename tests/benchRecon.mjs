import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const URL = process.argv[2] ?? 'https://www.ao1k.com/recon/';
const RUNS = Number(process.argv[3] ?? 5);
const PROFILE = process.argv[4] ?? 'desktop';
const OUT = process.argv[5];

const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 }, network: null, cpu: 1, mobile: false, scale: 1 },
  mobile: {
    viewport: { width: 412, height: 823 },
    network: { latency: 150, downloadThroughput: (1638.4 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
    cpu: 4,
    mobile: true,
    scale: 2.625,
  },
};

const MIN_SETTLE_MS = 15000;
const QUIET_MS = 3000;
const MAX_MS = 120000;
const LONG_TASK_MS = 50;
const INTERACTIVE_QUIET_MS = 5000;

const initScript = () => {
  window.__bench = { fcp: null, lcp: null, cubeCanvasAt: null, cubeLiveAt: null, longTasks: [] };
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) window.__bench.longTasks.push([e.startTime, e.startTime + e.duration]);
  }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (e.name === 'first-contentful-paint') window.__bench.fcp = e.startTime;
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver(list => {
    const entries = list.getEntries();
    window.__bench.lcp = entries[entries.length - 1].startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new MutationObserver((_, obs) => {
    const canvas = document.querySelector('#cube_model canvas');
    const svgSticker = document.querySelector('#cube_model svg.cube-svg path');
    if ((canvas && canvas.width > 0) || svgSticker) {
      window.__bench.cubeCanvasAt = performance.now();
      obs.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
  new MutationObserver((_, obs) => {
    const canvas = document.querySelector('#cube_model canvas');
    const svg = document.querySelector('#cube_model svg.cube-svg');
    const svgSceneDrawn = svg && svg.querySelector('path') && !svg.querySelector('style');
    if ((canvas && canvas.width > 0) || svgSceneDrawn) {
      window.__bench.cubeLiveAt = performance.now();
      obs.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
};

function pssKb(pid) {
  try {
    const text = readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
    const match = /^Pss:\s+(\d+) kB/m.exec(text);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

async function runOnce(profile) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    deviceScaleFactor: profile.scale,
  });
  await context.addCookies([{ name: 'infoPanelDismissed_v1', value: 'true', url: URL }]);
  await context.addInitScript(initScript);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (profile.network) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...profile.network });
  }
  if (profile.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });

  const finished = [];
  const pending = new Set();
  let lastActivity = Date.now();

  context.on('request', request => {
    pending.add(request);
    lastActivity = Date.now();
  });
  const settle = async (request, failure) => {
    pending.delete(request);
    lastActivity = Date.now();
    const timing = request.timing();
    const sizes = failure ? null : await request.sizes().catch(() => null);
    finished.push({
      url: request.url(),
      type: request.resourceType(),
      failure,
      startEpoch: timing.startTime,
      endEpoch: timing.responseEnd > 0 ? timing.startTime + timing.responseEnd : Date.now(),
      transferBytes: sizes ? sizes.responseBodySize + sizes.responseHeadersSize : 0,
      bodyBytes: sizes ? sizes.responseBodySize : 0,
      redirectedTo: request.redirectedTo()?.url() ?? null,
    });
  };
  context.on('requestfinished', request => settle(request, null));
  context.on('requestfailed', request => settle(request, request.failure()?.errorText ?? 'failed'));

  const wallStart = Date.now();
  await page.goto(URL, { waitUntil: 'load', timeout: MAX_MS });

  while (Date.now() - wallStart < MAX_MS) {
    const quiet = pending.size === 0 && Date.now() - lastActivity >= QUIET_MS;
    if (Date.now() - wallStart >= MIN_SETTLE_MS && quiet) break;
    await new Promise(r => setTimeout(r, 250));
  }

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      timeOrigin: performance.timeOrigin,
      ttfb: nav.responseStart,
      domContentLoaded: nav.domContentLoadedEventEnd,
      load: nav.loadEventEnd,
      fcp: window.__bench.fcp,
      lcp: window.__bench.lcp,
      cubeCanvas: window.__bench.cubeCanvasAt,
      cubeLive: window.__bench.cubeLiveAt,
      longTasks: window.__bench.longTasks,
    };
  });

  const longTasks = [...timing.longTasks].sort((a, b) => a[0] - b[0]);
  const tasksAfterCube = timing.cubeLive === null ? [] : longTasks.filter(([, end]) => end > timing.cubeLive);
  let interactive = timing.cubeLive;
  for (const [start, end] of tasksAfterCube) {
    if (start - interactive >= INTERACTIVE_QUIET_MS) break;
    interactive = Math.max(interactive, end);
  }

  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('Performance.enable');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const metric = name => metrics.find(m => m.name === name)?.value;

  const browserCdp = await browser.newBrowserCDPSession();
  const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
  const processes = processInfo.map(p => ({ type: p.type, pid: p.id, pssKb: pssKb(p.id) }));

  await browser.close();

  const firstStart = Math.min(...finished.map(r => r.startEpoch));
  const pageMsToFirst = ms => ms + timing.timeOrigin - firstStart;
  const requests = finished
    .filter(r => !r.url.startsWith('data:'))
    .map(r => ({ ...r, startMs: r.startEpoch - firstStart, endMs: r.endEpoch - firstStart }));
  const sumBytes = predicate => requests.filter(predicate).reduce((s, r) => s + r.transferBytes, 0);

  const fromFirst = {
    ttfb: pageMsToFirst(timing.ttfb),
    fcp: timing.fcp === null ? null : pageMsToFirst(timing.fcp),
    lcp: timing.lcp === null ? null : pageMsToFirst(timing.lcp),
    domContentLoaded: pageMsToFirst(timing.domContentLoaded),
    load: pageMsToFirst(timing.load),
    cubeCanvas: timing.cubeCanvas === null ? null : pageMsToFirst(timing.cubeCanvas),
    cubeLive: timing.cubeLive === null ? null : pageMsToFirst(timing.cubeLive),
    interactive: interactive === null ? null : pageMsToFirst(interactive),
  };

  return {
    timing: fromFirst,
    blockingAfterCube: {
      totalMs: tasksAfterCube.reduce((s, [start, end]) => s + Math.max(0, end - start - LONG_TASK_MS), 0),
      longestMs: tasksAfterCube.reduce((m, [start, end]) => Math.max(m, end - start), 0),
      tasks: tasksAfterCube.map(([start, end]) => ({ startMs: pageMsToFirst(start), durationMs: end - start })),
    },
    rawPageTiming: timing,
    bytes: {
      total: sumBytes(() => true),
      totalBody: requests.reduce((s, r) => s + r.bodyBytes, 0),
      byLoad: sumBytes(r => r.endMs <= fromFirst.load),
      byCube: fromFirst.cubeCanvas === null ? null : sumBytes(r => r.endMs <= fromFirst.cubeCanvas),
    },
    requestCount: requests.length,
    memory: {
      jsHeapUsed: metric('JSHeapUsedSize'),
      jsHeapTotal: metric('JSHeapTotalSize'),
      domNodes: metric('Nodes'),
      listeners: metric('JSEventListeners'),
      processes,
      totalPssKb: processes.reduce((s, p) => s + p.pssKb, 0),
    },
    requests,
  };
}

const profile = PROFILES[PROFILE];
const results = [];
const fmt = v => (v === null || v === undefined ? 'n/a' : v.toFixed(0));
for (let i = 0; i < RUNS; i++) {
  const result = await runOnce(profile);
  results.push(result);
  const t = result.timing;
  console.log(
    `run ${i + 1}: redirects=${result.requests.filter(r => r.redirectedTo).length} ttfb=${fmt(t.ttfb)} fcp=${fmt(t.fcp)} lcp=${fmt(t.lcp)}`
      + ` dcl=${fmt(t.domContentLoaded)} load=${fmt(t.load)} cube=${fmt(t.cubeCanvas)} live=${fmt(t.cubeLive)}`
      + ` interactive=${fmt(t.interactive)} tbtAfterCube=${fmt(result.blockingAfterCube.totalMs)}`
      + ` longestAfterCube=${fmt(result.blockingAfterCube.longestMs)}`
      + ` bytes=${result.bytes.total} reqs=${result.requestCount}`
      + ` heap=${(result.memory.jsHeapUsed / 1e6).toFixed(1)}MB pss=${(result.memory.totalPssKb / 1024).toFixed(0)}MB`,
  );
}
if (OUT) writeFileSync(OUT, JSON.stringify({ url: URL, profile: PROFILE, date: new Date().toISOString(), results }, null, 2));
