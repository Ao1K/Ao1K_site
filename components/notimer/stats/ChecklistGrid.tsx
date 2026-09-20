'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { List, useListCallbackRef, type RowComponentProps } from 'react-window';
import { useLiveQuery } from 'dexie-react-hooks';

import type { Prompt } from '../../../composables/notimer/db';
import {
  countSolves,
  getAnswersFor,
  getSolveWindow,
  listPrompts,
} from '../../../composables/notimer/dbUtils';
import { optionOf, useStatsLayout } from '../../../composables/notimer/statsLayout';
import { useMeasuredHeight } from '../../../composables/notimer/useMeasuredHeights';
import { promptGlyph } from '../checklistConstants';
import AnswerPie, { type AnswerTally } from './AnswerPie';
import RollingNumber from './RollingNumber';
import StatCard from './StatCard';
import StatSelect, { type StatSelectOption } from './StatSelect';
import type { StatElementProps } from './statTypes';

export const CHECKLIST_GRID_ID = 'checklistGrid';
export const ROW_COUNT_KEY = 'rows';
export const FIT_TO_SPACE = 0;
export const DEFAULT_ROW_COUNT = FIT_TO_SPACE;

const ROW_COUNT_OPTIONS: StatSelectOption[] = [
  { value: 5, label: '5' },
  { value: 12, label: '12' },
  { value: 25, label: '25' },
  { value: FIT_TO_SPACE, label: 'Max' },
];

const CELL_SIZE = 16;
const ROW_GAP = 4;
const ROW_PITCH = CELL_SIZE + ROW_GAP;
const UNMEASURED_ROW_COUNT = 12;
const OVERSCAN_ROWS = 8;
const GLYPH_FOOTER_HEIGHT = CELL_SIZE;
const FETCH_STEP_ROWS = 16;
const FETCH_MARGIN_ROWS = 48;
const GLIDE_HALF_LIFE_MS = 45;
const GLIDE_SETTLE_PX = 0.5;
const ASSUMED_FRAME_MS = 16;

const NO_PROMPTS: Prompt[] = [];
const COLUMN_CLASS = 'w-4 shrink-0';
const EMPTY_TALLY: AnswerTally = { yes: 0, no: 0, none: 0 };

type ValuesByRow = Map<number, Map<number, number | null>>;

const NO_VALUES: ValuesByRow = new Map();
const RowValuesContext = createContext<ValuesByRow>(NO_VALUES);

interface GridRowData {
  columns: Prompt[];
  blankRowsAboveFirstSolve: number;
  solveCount: number;
}

function rowsThatFit(room: number): number {
  return Math.max(0, Math.floor(room / ROW_PITCH));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cellTone(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'border-neutral-700 bg-transparent';
  return value ? 'border-transparent bg-green-300' : 'border-transparent bg-orange-300';
}

function cellLabel(prompt: Prompt, value: number | null | undefined): string {
  if (value === null || value === undefined) return `${prompt.text}: unanswered`;
  return `${prompt.text}: ${value ? 'yes' : 'no'}`;
}

function ColumnGlyphs({ columns }: { columns: Prompt[] }) {
  return (
    <div className="flex shrink-0 gap-1">
      {columns.map((prompt) => (
        <span
          key={prompt.id}
          title={prompt.text}
          className={`${COLUMN_CLASS} h-4 overflow-hidden text-center text-sm leading-4 text-dark_accent select-none`}
        >
          {promptGlyph(prompt.id)}
        </span>
      ))}
    </div>
  );
}

function GridRow({
  index,
  style,
  columns,
  blankRowsAboveFirstSolve,
  solveCount,
}: RowComponentProps<GridRowData>) {
  const valuesByRow = useContext(RowValuesContext);
  const solveRow = index - blankRowsAboveFirstSolve;
  if (solveRow < 0 || solveRow > solveCount) return <div style={style} />;

  const values = valuesByRow.get(solveRow);

  return (
    <div style={style} className="flex items-start gap-1">
      {columns.map((prompt) => {
        const value = values?.get(prompt.id);
        return (
          <span
            key={prompt.id}
            title={cellLabel(prompt, value)}
            className={`${COLUMN_CLASS} h-4 rounded-xs border transition-colors duration-150 ${cellTone(value)}`}
          />
        );
      })}
    </div>
  );
}

export default function ChecklistGrid({
  title,
  cursorIndex,
}: StatElementProps): React.ReactElement | null {
  const { settings, setOption } = useStatsLayout();
  const requestedRows = optionOf(
    settings.options,
    CHECKLIST_GRID_ID,
    ROW_COUNT_KEY,
    DEFAULT_ROW_COUNT,
  );

  const [list, setList] = useListCallbackRef(null);
  const hasPlaced = useRef(false);
  const [gridHeight, gridRef] = useMeasuredHeight(CHECKLIST_GRID_ID);
  const fitToSpace = requestedRows === FIT_TO_SPACE;

  const solveCount = useLiveQuery(() => countSolves(), [], undefined);
  const prompts = useLiveQuery(() => listPrompts(), [], undefined);

  const columns = useMemo(
    () => (prompts ?? NO_PROMPTS).filter((prompt) => prompt.kind === 'boolean'),
    [prompts],
  );

  const rowLimit = !fitToSpace
    ? requestedRows
    : gridHeight > 0
      ? rowsThatFit(gridHeight - GLYPH_FOOTER_HEIGHT)
      : UNMEASURED_ROW_COUNT;

  const blankRowsAboveFirstSolve = Math.max(0, rowLimit - 1);
  const cursorRow = Math.min(cursorIndex, solveCount ?? 0);
  const targetScrollTop = cursorRow * ROW_PITCH;
  const longestGlide = rowLimit * ROW_PITCH;

  const fetchAnchor = Math.floor(cursorRow / FETCH_STEP_ROWS) * FETCH_STEP_ROWS;
  const fetchStart = Math.max(0, fetchAnchor - rowLimit + 1 - FETCH_MARGIN_ROWS);
  const fetchCount = Math.max(0, fetchAnchor + FETCH_STEP_ROWS + FETCH_MARGIN_ROWS - fetchStart);

  const fetched = useLiveQuery(
    async () => {
      const solves = await getSolveWindow(fetchStart, fetchCount);
      const answers = await getAnswersFor(solves.map((solve) => solve.id));
      return { start: fetchStart, solves, answers };
    },
    [fetchStart, fetchCount],
    undefined,
  );

  const valuesByRow = useMemo<ValuesByRow>(() => {
    const byRow: ValuesByRow = new Map();
    if (!fetched) return byRow;

    const rowOfSolve = new Map<number, number>();
    fetched.solves.forEach((solve, position) => rowOfSolve.set(solve.id, fetched.start + position));

    for (const answer of fetched.answers) {
      const row = rowOfSolve.get(answer.solveId);
      if (row === undefined) continue;
      let values = byRow.get(row);
      if (!values) {
        values = new Map();
        byRow.set(row, values);
      }
      values.set(answer.promptId, answer.value);
    }
    return byRow;
  }, [fetched]);

  const topRow = cursorRow - rowLimit + 1;

  const talliesByPrompt = useMemo(() => {
    const byPrompt = new Map<number, AnswerTally>();
    for (const prompt of columns) byPrompt.set(prompt.id, { yes: 0, no: 0, none: 0 });

    for (let row = Math.max(0, topRow); row <= cursorRow; row += 1) {
      const values = valuesByRow.get(row);
      for (const prompt of columns) {
        const counts = byPrompt.get(prompt.id);
        if (!counts) continue;
        const value = values?.get(prompt.id);
        if (value === null || value === undefined) counts.none += 1;
        else if (value) counts.yes += 1;
        else counts.no += 1;
      }
    }
    return byPrompt;
  }, [valuesByRow, columns, topRow, cursorRow]);

  const rowProps = useMemo<GridRowData>(
    () => ({ columns, blankRowsAboveFirstSolve, solveCount: solveCount ?? 0 }),
    [columns, blankRowsAboveFirstSolve, solveCount],
  );

  useEffect(() => {
    const element = list?.element;
    if (!element) return;

    const jumpTo = (top: number) => element.scrollTo({ top, behavior: 'instant' });

    const isLeap = Math.abs(targetScrollTop - element.scrollTop) > longestGlide;

    if (!hasPlaced.current || isLeap || prefersReducedMotion()) {
      hasPlaced.current = true;
      jumpTo(targetScrollTop);
      return;
    }

    let frame = 0;
    let previousFrameTime: number | null = null;

    const glide = (now: number) => {
      const remaining = targetScrollTop - element.scrollTop;
      if (Math.abs(remaining) <= GLIDE_SETTLE_PX) {
        jumpTo(targetScrollTop);
        return;
      }

      const elapsed = previousFrameTime === null ? ASSUMED_FRAME_MS : now - previousFrameTime;
      previousFrameTime = now;

      const step = remaining * (1 - 0.5 ** (elapsed / GLIDE_HALF_LIFE_MS));
      const before = element.scrollTop;
      jumpTo(before + step);

      if (step !== 0 && element.scrollTop === before) {
        jumpTo(targetScrollTop);
        return;
      }
      frame = requestAnimationFrame(glide);
    };

    frame = requestAnimationFrame(glide);
    return () => cancelAnimationFrame(frame);
  }, [list, targetScrollTop, longestGlide]);

  const oldestShown = Math.max(0, topRow);
  const newestShown = Math.min(cursorRow, (solveCount ?? 0) - 1);
  const rangeTitle: React.ReactNode =
    newestShown < oldestShown ? (
      title
    ) : (
      <span className="inline-flex items-center">
        Solve&nbsp;
        <RollingNumber value={oldestShown + 1} />
        {oldestShown === newestShown ? null : (
          <>
            -
            <RollingNumber value={newestShown + 1} />
          </>
        )}
      </span>
    );

  const rowSelect = (
    <StatSelect
      label="Solves shown"
      value={requestedRows}
      options={ROW_COUNT_OPTIONS}
      onChange={(rows) => setOption(CHECKLIST_GRID_ID, ROW_COUNT_KEY, rows)}
    />
  );

  if (prompts === undefined || solveCount === undefined) return null;

  if (columns.length === 0) {
    return (
      <StatCard title={title} controls={rowSelect}>
        <p className="text-xs text-neutral-500">Add a yes / no checklist item to fill this in.</p>
      </StatCard>
    );
  }

  if (solveCount === 0) {
    return (
      <StatCard title={title} controls={rowSelect}>
        <p className="text-xs text-neutral-500">No solves recorded yet.</p>
      </StatCard>
    );
  }

  return (
    <StatCard title={rangeTitle} controls={rowSelect} fills={fitToSpace}>
      <div className={`flex min-h-0 flex-col gap-1 overflow-hidden ${fitToSpace ? 'flex-1' : ''}`}>
        <ColumnGlyphs columns={columns} />

        <div className="flex shrink-0 gap-1">
          {columns.map((prompt) => (
            <AnswerPie
              key={prompt.id}
              tally={talliesByPrompt.get(prompt.id) ?? EMPTY_TALLY}
              label={prompt.text}
              className={`${COLUMN_CLASS} h-4`}
            />
          ))}
        </div>

        <div
          ref={gridRef}
          className={`flex min-h-0 flex-col overflow-hidden ${fitToSpace ? 'flex-1' : ''}`}
        >
          <RowValuesContext.Provider value={valuesByRow}>
            <List
              className="scrollbar-hidden"
              listRef={setList}
              rowComponent={GridRow}
              rowCount={blankRowsAboveFirstSolve + solveCount + 1}
              rowHeight={ROW_PITCH}
              rowProps={rowProps}
              overscanCount={OVERSCAN_ROWS}
              style={{
                height: rowLimit * ROW_PITCH,
                flexGrow: 0,
                flexShrink: 0,
                overflowY: 'hidden',
              }}
            />
          </RowValuesContext.Provider>

          <ColumnGlyphs columns={columns} />
        </div>
      </div>
    </StatCard>
  );
}
