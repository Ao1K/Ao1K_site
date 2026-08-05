// Export helpers for the "Your Algs" list. Both exports operate on a caller-supplied list so
// only the cards visible after filtering get written out. CSV downloads directly; the PDF is
// produced by opening a clean print window the browser saves as a PDF.

import { STORE_VERSION, type AlgStatus, type FavoriteAlg } from './algFavorites';
import type { SvgShape } from '../recon/stepIconDescriptors';
import type { CubeColors } from '../useSettings';
import { classifyFavorite, type AlgClassification } from './classifyAlg';
import { buildAlgIcon } from './algIcon';

const STATUS_LABEL: Record<AlgStatus, string> = {
  learning: 'Learning',
  learned: 'Memorized',
  none: 'Unlearned',
};

// status order used to group the PDF list
const STATUS_ORDER: AlgStatus[] = ['learning', 'learned', 'none'];

// collapse runs of whitespace so spacing reads cleanly regardless of how the alg was entered
const cleanAlg = (alg: string): string => alg.trim().replace(/\s+/g, ' ');

// slice turn metric, matching the recon page: count moves but skip rotations (x/y/z) and
// bare modifier tokens, i.e. anything made only of x, y, z, 2 or '
const moveCount = (alg: string): number =>
  cleanAlg(alg).split(' ').filter((move) => /[^xyz2']/.test(move)).length;

const dateStamp = (d: Date): string =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

const csvEscape = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

// the override label if set, otherwise the detected algset
const algsetLabel = (f: FavoriteAlg): string => classifyFavorite(f).label;

export const favoritesToCsv = (favorites: FavoriteAlg[]): string => {
  const rows = [
    ['Version', String(STORE_VERSION)],
    ['Algorithm', 'Algset', 'Status', 'Moves'],
    ...favorites.map((f) => [cleanAlg(f.alg), algsetLabel(f), STATUS_LABEL[f.status], String(moveCount(f.alg))]),
  ];
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadFavoritesCsv = (favorites: FavoriteAlg[]) => {
  const blob = new Blob([favoritesToCsv(favorites)], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `YourAlgs_${dateStamp(new Date())}.csv`);
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const shapeToSvg = (shape: SvgShape): string => {
  if (shape.type === 'rect')
    return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${shape.fill}"/>`;
  if (shape.type === 'polygon') return `<polygon points="${shape.points}" fill="${shape.fill}"/>`;
  return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="${shape.fill}"/>`;
};

// the same step icon shown on each card, serialized as inline SVG (matching AlgIcon)
const algIconSvg = (c: AlgClassification, alg: string, cubeColors: CubeColors, label: string): string => {
  const { descriptor, showName } = buildAlgIcon(c, alg, cubeColors);
  if (!descriptor) {
    return `<svg class="icon" viewBox="0 0 24 24"><text x="12" y="13" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="bold" fill="#1a1a1a">${escapeHtml(label.slice(0, 6) || '?')}</text></svg>`;
  }
  const shapes = descriptor.shapes.map(shapeToSvg).join('');
  const name = showName && descriptor.name
    ? `<text x="12" y="13" text-anchor="middle" dominant-baseline="central" font-size="${descriptor.name.length <= 2 ? 10 : 8}" font-weight="bold" fill="${descriptor.nameColor || '#1a1a1a'}">${escapeHtml(descriptor.name)}</text>`
    : '';
  const cls = descriptor.enlarge ? 'icon enlarge' : 'icon';
  return `<svg class="${cls}" viewBox="${descriptor.viewBox}" stroke="#52525b" stroke-width="${descriptor.strokeWidth ?? 1}" fill="none">${shapes}${name}</svg>`;
};

const buildPrintHtml = (favorites: FavoriteAlg[], cubeColors: CubeColors): string => {
  const now = new Date();
  const date = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const stamp = dateStamp(now);
  const count = favorites.length;
  // absolute URL so the logo resolves inside the blob-URL document; onload waits for it before printing
  const logoUrl = `${window.location.origin}/Ao1K-Logo-v2.svg`;

  const groups = STATUS_ORDER
    .map((status) => ({ status, algs: favorites.filter((f) => f.status === status) }))
    .filter((g) => g.algs.length > 0);

  // each group is a table so its <thead> heading repeats at the top of every page the group spans
  const sections = groups
    .map(({ status, algs }) => {
      const rows = algs
        .map((f, i) => {
          const alg = cleanAlg(f.alg);
          const icon = algIconSvg(classifyFavorite(f), f.alg, cubeColors, algsetLabel(f));
          return `<tr><td class="num">${i + 1}.</td><td class="icon-cell">${icon}</td><td class="alg">${escapeHtml(alg)}</td><td class="moves">${moveCount(alg)} stm</td></tr>`;
        })
        .join('');
      const heading = `${escapeHtml(STATUS_LABEL[status])} <span class="tally">(${algs.length})</span>`;
      // thead (spacer + heading) repeats at the top of every page the group spans, and tfoot
      // repeats at the bottom; together they form the top/bottom page margins on every page while
      // @page margin stays 0 so the browser draws no header/footer
      return `<table><thead><tr class="pad"><td colspan="4"></td></tr><tr><th colspan="4"><h2>${heading}</h2></th></tr></thead><tfoot><tr class="pad"><td colspan="4"></td></tr></tfoot><tbody>${rows}</tbody></table>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>YourAlgs_${stamp}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 2.5rem; }
  h1 { font-size: 1.6rem; line-height: 2.2rem; white-space: nowrap; margin: 0 0 0.25rem; }
  h1 .logo { height: 2.2rem; width: auto; margin: 0 -0.4rem 0 0.6rem; vertical-align: -0.54rem; vertical-align: calc(0.5cap - 1.1rem - 0.5px); }
  .meta { color: #666; font-size: 0.85rem; margin: 0 0 1.5rem; }
  /* each group is a table; tables may break across pages so a long group flows on instead of
     jumping to a new page, and the thead heading repeats at the top of each page it spans */
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  /* empty rows that repeat per page to form the top and bottom page margins */
  .pad td { height: 1in; padding: 0; border: 0; }
  th { text-align: left; padding: 0; }
  h2 { font-size: 1.05rem; margin: 0 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #ddd; }
  .tally { color: #999; font-weight: normal; font-size: 0.85rem; }
  /* keep an individual row (icon + alg + moves) from splitting across a page boundary */
  tr { break-inside: avoid; }
  td { padding: 0.3rem 0; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  .num { width: 1.75rem; color: #999; font-size: 0.85rem; text-align: right; padding-right: 0.6rem; white-space: nowrap; }
  .icon-cell { width: 32px; padding-right: 0.75rem; }
  .icon { display: block; width: 24px; height: 24px; border: 1px solid #a3a3a3; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .icon.enlarge { width: 32px; height: 32px; border: 0; background: transparent; margin: -2px 0; }
  .alg { width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 1rem; letter-spacing: 0.05em; word-spacing: 0.35em; }
  .moves { color: #888; font-size: 0.8rem; white-space: nowrap; text-align: right; padding-left: 0.75rem; }
  /* keep the page margin at zero so the browser draws no header/footer; the inch of margin on
     every side comes from body side-padding plus the repeating thead/tfoot spacer rows */
  @page { margin: 0; }
  @media print { body { margin: 0; padding: 1in 1in 0; } }
</style>
</head>
<body>
  <h1><span>Your Algs</span><img class="logo" src="${escapeHtml(logoUrl)}" alt="Ao1K"><span>.com</span></h1>
  <p class="meta">${count} algorithm${count === 1 ? '' : 's'} &middot; exported ${escapeHtml(date)}</p>
  ${sections}
</body>
</html>`;
};

export const downloadFavoritesPdf = (favorites: FavoriteAlg[], cubeColors: CubeColors) => {
  // print from a hidden iframe so no extra tab is spawned. The iframe's load event waits for
  // the document and its logo image; afterprint cleans everything up once the dialog closes.
  const url = URL.createObjectURL(new Blob([buildPrintHtml(favorites, cubeColors)], { type: 'text/html' }));
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;';

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    URL.revokeObjectURL(url);
    iframe.remove();
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener('afterprint', cleanup);
    win.focus();
    win.print();
  };

  iframe.src = url;
  document.body.appendChild(iframe);
};
