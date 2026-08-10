// CSV import for the "Your Algs" list, the counterpart to exportFavorites. Reads back the
// exported columns (Algorithm, Algset, Status) but stays lenient: the version row, the header
// row and every column but the alg itself are optional, so a plain one-column list of algs
// imports too. Rows whose alg isn't a move sequence are reported as invalid instead of stored.

import { STORE_VERSION, migrateFavorites, type AlgStatus, type FavoriteAlg } from './algFavorites';
import { isMoveSequence, tokenize } from './algMoves';
import { classifyAlg } from './classifyAlg';

export interface ParsedImport {
  favorites: FavoriteAlg[];
  invalid: number;
}

const ALGSET_MAX = 6;

const STATUS_BY_LABEL: Record<string, AlgStatus> = {
  learning: 'learning',
  memorized: 'learned',
  learned: 'learned',
  unlearned: 'none',
  none: 'none',
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') { field += char; i += 1; continue; }
      if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
      quoted = false;
      i += 1;
      continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ',') { row.push(field); field = ''; i += 1; continue; }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((value) => value.trim() !== ''));
};

const normalizeHeader = (value: string): string => value.trim().toLowerCase();

// the version row is written above the header by the export, as: Version,<n>
const declaredVersion = (rows: string[][]): number | null => {
  const row = rows.find((r) => normalizeHeader(r[0]) === 'version');
  if (!row) return null;
  const version = Number(row[1]);
  return Number.isFinite(version) ? version : null;
};

const headerIndex = (rows: string[][]): number =>
  rows.findIndex((row) => row.some((cell) => ['alg', 'algorithm'].includes(normalizeHeader(cell))));

const columnMap = (header: string[]) => {
  const find = (...names: string[]) => header.findIndex((cell) => names.includes(normalizeHeader(cell)));
  return {
    alg: find('alg', 'algorithm'),
    algset: find('algset', 'set'),
    status: find('status'),
  };
};

// an algset column that already matches what the alg classifies as carries no information, so
// only a genuine override is stored; that keeps an export/import round trip lossless
const overrideFor = (alg: string, algset: string): string | undefined => {
  const trimmed = algset.trim();
  if (trimmed === '' || trimmed === '?') return undefined;
  if (trimmed === classifyAlg(alg).label) return undefined;
  return trimmed.slice(0, ALGSET_MAX);
};

export const parseFavoritesCsv = (text: string): ParsedImport => {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const version = declaredVersion(rows);
  const headerAt = headerIndex(rows);
  const columns = headerAt === -1 ? { alg: 0, algset: -1, status: -1 } : columnMap(rows[headerAt]);
  const body = rows
    .slice(headerAt + 1)
    .filter((row) => headerAt !== -1 || normalizeHeader(row[0]) !== 'version');

  const favorites: FavoriteAlg[] = [];
  const seen = new Set<string>();
  let invalid = 0;

  body.forEach((row) => {
    const alg = tokenize(row[columns.alg] ?? '').join(' ');
    if (!isMoveSequence(alg)) {
      invalid += 1;
      return;
    }
    if (seen.has(alg)) return;
    seen.add(alg);
    const status = STATUS_BY_LABEL[normalizeHeader(row[columns.status] ?? '')] ?? 'learning';
    favorites.push({ alg, status, algset: overrideFor(alg, row[columns.algset] ?? '') });
  });

  // a file with no version row is read as the current shape: it is either hand-written or a
  // bare list of algs, neither of which carries the older columns a migration would look for
  return { favorites: migrateFavorites(favorites, version ?? STORE_VERSION), invalid };
};
