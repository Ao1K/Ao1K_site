// accepts JuJu's zbll list

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

type ZipEntries = Map<string, Buffer>;

function readZip(file: string): ZipEntries {
  const buf = fs.readFileSync(file);

  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`not a zip archive: ${file}`);

  const entries: ZipEntries = new Map();
  let offset = buf.readUInt32LE(eocd + 16);

  while (buf.readUInt32LE(offset) === 0x02014b50) {
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength);

    const localNameLength = buf.readUInt16LE(localOffset + 26);
    const localExtraLength = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buf.subarray(start, start + compressedSize);

    entries.set(name, method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw));

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readXml(entries: ZipEntries, name: string): string {
  const entry = entries.get(name);
  if (!entry) throw new Error(`missing ${name} in workbook`);
  return entry.toString('utf8');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

function textOf(xml: string): string {
  const parts = xml.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) || [];
  return parts
    .map(part => decodeEntities(part.replace(/^<t(?:\s[^>]*)?>/, '').replace(/<\/t>$/, '')))
    .join('');
}

function readSharedStrings(entries: ZipEntries): string[] {
  if (!entries.has('xl/sharedStrings.xml')) return [];
  const xml = readXml(entries, 'xl/sharedStrings.xml');
  return (xml.match(/<si>[\s\S]*?<\/si>/g) || []).map(textOf);
}

interface SheetRef {
  name: string;
  target: string;
}

function readSheets(entries: ZipEntries): SheetRef[] {
  const workbook = readXml(entries, 'xl/workbook.xml');
  const rels = readXml(entries, 'xl/_rels/workbook.xml.rels');

  const targets = new Map<string, string>();
  for (const rel of rels.match(/<Relationship\s[^>]*\/>/g) || []) {
    const id = /Id="([^"]+)"/.exec(rel)?.[1];
    const target = /Target="([^"]+)"/.exec(rel)?.[1];
    if (id && target) targets.set(id, path.posix.normalize(path.posix.join('xl', target)));
  }

  const sheets: SheetRef[] = [];
  for (const sheet of workbook.match(/<sheet\s[^>]*\/>/g) || []) {
    const name = /name="([^"]+)"/.exec(sheet)?.[1];
    const id = /r:id="([^"]+)"/.exec(sheet)?.[1];
    const target = id ? targets.get(id) : undefined;
    if (name && target) sheets.push({ name: decodeEntities(name), target });
  }
  return sheets;
}

interface Cell {
  column: string;
  row: number;
  value: string;
}

function readCells(xml: string, sharedStrings: string[]): Cell[] {
  const cells: Cell[] = [];

  for (const match of xml.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attributes = match[1];
    const body = match[2] || '';
    const ref = /r="([A-Z]+)(\d+)"/.exec(attributes);
    if (!ref) continue;

    const type = /t="([^"]+)"/.exec(attributes)?.[1];
    let value: string;
    if (type === 'inlineStr') {
      value = textOf(body);
    } else {
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      if (raw === undefined) continue;
      value = type === 's' ? sharedStrings[Number(raw)] ?? '' : decodeEntities(raw);
    }

    cells.push({ column: ref[1], row: Number(ref[2]), value });
  }

  return cells;
}

function readNotes(entries: ZipEntries, sheetTarget: string): Cell[] {
  const sheetDir = path.posix.dirname(sheetTarget);
  const relsPath = path.posix.join(sheetDir, '_rels', `${path.posix.basename(sheetTarget)}.rels`);
  if (!entries.has(relsPath)) return [];

  const rels = readXml(entries, relsPath);
  const rel = (rels.match(/<Relationship\s[^>]*\/>/g) || []).find(entry =>
    /Type="[^"]*\/comments"/.test(entry),
  );
  const target = rel ? /Target="([^"]+)"/.exec(rel)?.[1] : undefined;
  if (!target) return [];

  const commentsPath = path.posix.normalize(path.posix.join(sheetDir, target));
  if (!entries.has(commentsPath)) return [];

  const xml = readXml(entries, commentsPath);
  const authors = (xml.match(/<author>[\s\S]*?<\/author>|<author\/>/g) || []).map(author =>
    decodeEntities(author.replace(/^<author>/, '').replace(/<\/author>$/, '').replace(/^<author\/>$/, '')),
  );

  const notes: Cell[] = [];
  for (const match of xml.matchAll(/<comment\s([^>]*)>([\s\S]*?)<\/comment>/g)) {
    const ref = /ref="([A-Z]+)(\d+)"/.exec(match[1]);
    const authorId = Number(/authorId="(\d+)"/.exec(match[1])?.[1] ?? -1);
    if (!ref || authors[authorId] !== '') continue;
    notes.push({ column: ref[1], row: Number(ref[2]), value: textOf(match[2]) });
  }

  return notes;
}

const headerPattern = /^3x3\s+algorithms?$/i;
const movePattern = /^[RUFLDBrufldbMESxyz][123]?'?$/;
const leadingUPattern = /^U(?:2'?|')?(?:\s+|$)/;
const invisiblePattern = /[​-‏‪-‮⁠﻿]/g;
const wideSpacePattern = /[  - 　]/g;
const apostrophePattern = /[‘’ʼ′´]/g;
const annotationPattern = /\*[^*]*\*/g;
const groupingPattern = /[()[\]{}]/g;

function cleanLine(line: string): string {
  let alg = line
    .split('/')[0]
    .replace(annotationPattern, '')
    .replace(invisiblePattern, '')
    .replace(wideSpacePattern, ' ')
    .replace(apostrophePattern, "'")
    .replace(groupingPattern, '')
    .replace(/\s+/g, ' ')
    .trim();

  while (leadingUPattern.test(alg)) {
    alg = alg.replace(leadingUPattern, '').trim();
  }

  return alg;
}

function isAlg(alg: string): boolean {
  const moves = alg.split(' ');
  return moves.length > 1 && moves.every(move => movePattern.test(move));
}

function collectAlgs(entries: ZipEntries): string[] {
  const sharedStrings = readSharedStrings(entries);
  const algs: string[] = [];

  for (const sheet of readSheets(entries)) {
    const cells = readCells(readXml(entries, sheet.target), sharedStrings);
    const headers = cells.filter(cell => headerPattern.test(cell.value.trim()));
    if (headers.length === 0) continue;

    const headerRows = new Map(headers.map(header => [header.column, header.row]));
    const belowHeader = (cell: Cell) => {
      const headerRow = headerRows.get(cell.column);
      return headerRow !== undefined && cell.row > headerRow;
    };

    const sources = [...cells, ...readNotes(entries, sheet.target)].filter(belowHeader);
    sources.sort((a, b) => a.row - b.row || a.column.localeCompare(b.column));

    for (const source of sources) {
      for (const line of source.value.split('\n')) {
        const alg = cleanLine(line);
        if (isAlg(alg)) algs.push(alg);
      }
    }
  }

  return [...new Set(algs)];
}

function main() {
  const workbookPath = path.join(process.cwd(), 'utils', 'ZBLL.xlsx');
  const algs = collectAlgs(readZip(workbookPath));

  const outputPath = path.join(process.cwd(), 'utils', 'rawZBLLdata.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(algs, null, 2)}\n`, 'utf-8');

  console.log(`Wrote ${algs.length} ZBLL algs to utils/rawZBLLdata.json`);
}

main();
