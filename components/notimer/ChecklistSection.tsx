'use client';

import React, { useRef, useState } from 'react';
import type { Prompt, PromptPhase } from '../../composables/notimer/db';
import { reorderPrompt } from '../../composables/notimer/dbUtils';
import ChecklistAddRow from './ChecklistAddRow';
import ChecklistHiddenRow from './ChecklistHiddenRow';
import ChecklistPromptRow from './ChecklistPromptRow';
import { coarseTouchTarget } from './checklistConstants';

interface ChecklistSectionProps {
  phase: PromptPhase;
  title: string;
  empty: string;
  placeholder: string;
  prompts: Prompt[];
  hiddenPrompts: Prompt[];
  confirmingId: number | null;
  onConfirmingIdChange: (id: number | null) => void;
}

interface RowBounds {
  top: number;
  height: number;
}

interface PendingOrder {
  ids: number[];
  writtenOver: string;
}

interface DragState {
  pointerId: number;
  fromIndex: number;
  grabY: number;
  pointerY: number;
  bounds: RowBounds[];
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const dropGapFor = (bounds: RowBounds[], y: number, fromIndex: number): number => {
  const gapIndex = bounds.filter((row) => row.top + row.height / 2 < y).length;
  return gapIndex === fromIndex ? fromIndex + 1 : gapIndex;
};

const indexAfterRemoval = (gapIndex: number, fromIndex: number): number =>
  gapIndex > fromIndex ? gapIndex - 1 : gapIndex;

const gapTop = (bounds: RowBounds[], gapIndex: number): number => {
  if (gapIndex < bounds.length) return bounds[gapIndex].top;

  const last = bounds[bounds.length - 1];
  return last.top + last.height;
};

const dragLayout = ({ bounds, fromIndex, grabY, pointerY }: DragState) => {
  const dragged = bounds[fromIndex];
  const last = bounds[bounds.length - 1];
  const gapIndex = dropGapFor(bounds, pointerY, fromIndex);

  return {
    rowIndex: fromIndex,
    gapIndex,
    lineTop: gapTop(bounds, gapIndex),
    offsetY: clamp(
      pointerY - grabY,
      -dragged.top,
      last.top + last.height - dragged.top - dragged.height,
    ),
  };
};

const orderSignature = (prompts: Prompt[]): string =>
  prompts.map((prompt) => `${prompt.id}:${prompt.position}`).join(',');

const applyPendingOrder = (prompts: Prompt[], pending: PendingOrder | null): Prompt[] => {
  if (pending === null || pending.writtenOver !== orderSignature(prompts)) return prompts;

  const byId = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const reordered = pending.ids
    .map((id) => byId.get(id))
    .filter((prompt): prompt is Prompt => prompt !== undefined);

  return reordered.length === prompts.length ? reordered : prompts;
};

export default function ChecklistSection({
  phase,
  title,
  empty,
  placeholder,
  prompts,
  hiddenPrompts,
  confirmingId,
  onConfirmingIdChange,
}: ChecklistSectionProps): React.ReactElement {
  const [hiddenShown, setHiddenShown] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);

  const frameRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const ordered = applyPendingOrder(prompts, pendingOrder);
  const layout = drag === null ? null : dragLayout(drag);

  const moveRow = (fromIndex: number, toIndex: number) => {
    if (toIndex === fromIndex || toIndex < 0 || toIndex >= ordered.length) return;

    const ids = ordered.map((prompt) => prompt.id);
    const [movedId] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, movedId);

    setPendingOrder({ ids, writtenOver: orderSignature(prompts) });
    reorderPrompt(movedId, toIndex);
  };

  const pointerYInFrame = (event: React.PointerEvent): number | null => {
    const frame = frameRef.current;
    if (!frame) return null;
    return event.clientY - frame.getBoundingClientRect().top;
  };

  const beginDrag = (event: React.PointerEvent, fromIndex: number) => {
    const list = listRef.current;
    const y = pointerYInFrame(event);
    if (!list || y === null) return;

    const bounds = Array.from(list.children).map((row) => ({
      top: (row as HTMLElement).offsetTop,
      height: (row as HTMLElement).offsetHeight,
    }));
    if (bounds.length === 0) return;

    setDrag({ pointerId: event.pointerId, fromIndex, grabY: y, pointerY: y, bounds });
  };

  const updateDrag = (event: React.PointerEvent) => {
    const y = pointerYInFrame(event);
    if (!drag || event.pointerId !== drag.pointerId || y === null) return;

    setDrag({ ...drag, pointerY: y });
  };

  const endDrag = (event: React.PointerEvent) => {
    if (!drag || layout === null || event.pointerId !== drag.pointerId) return;

    moveRow(drag.fromIndex, indexAfterRemoval(layout.gapIndex, drag.fromIndex));
    setDrag(null);
  };

  const heading = (
    <h3 className="-mx-2 mb-2 flex items-baseline gap-x-3 border-b border-neutral-600 px-2 pb-1 text-lg font-medium text-dark_accent">
      {title}
      <span className="ml-auto text-xs font-normal text-neutral-400">
        {prompts.length === 0 ? '' : `${prompts.length} item${prompts.length === 1 ? '' : 's'}`}
      </span>
    </h3>
  );

  const dropLine = layout && (
    <div
      aria-hidden
      style={{ top: layout.lineTop }}
      className="pointer-events-none absolute inset-x-2 z-20 h-0.5 -translate-y-1/2 bg-primary-100"
    />
  );

  const itemList =
    prompts.length === 0 ? (
      <p className="px-2 py-1 text-sm text-neutral-400">{empty}</p>
    ) : (
      <div
        ref={frameRef}
        onPointerMove={updateDrag}
        onPointerUp={endDrag}
        onPointerCancel={() => setDrag(null)}
        onLostPointerCapture={() => setDrag(null)}
        className="relative"
      >
        <ul ref={listRef} className="flex flex-col">
          {ordered.map((prompt, index) => (
            <ChecklistPromptRow
              key={prompt.id}
              prompt={prompt}
              dragOffset={layout !== null && layout.rowIndex === index ? layout.offsetY : null}
              onDragStart={(event) => beginDrag(event, index)}
              onKeyboardMove={(offset) => moveRow(index, index + offset)}
            />
          ))}
        </ul>

        {dropLine}
      </div>
    );

  const hiddenList = (
    <ul className="flex flex-col">
      {hiddenPrompts.map((prompt) => (
        <ChecklistHiddenRow
          key={prompt.id}
          prompt={prompt}
          confirming={confirmingId === prompt.id}
          onConfirmingChange={(confirming) => {
            if (confirming) onConfirmingIdChange(prompt.id);
            else if (confirmingId === prompt.id) onConfirmingIdChange(null);
          }}
        />
      ))}
    </ul>
  );

  const toggleHidden = () => {
    onConfirmingIdChange(null);
    setHiddenShown(!hiddenShown);
  };

  const hiddenBlock = hiddenPrompts.length === 0 ? null : (
    <>
      <button
        type="button"
        onClick={toggleHidden}
        className={`mx-2 flex cursor-pointer items-center py-1 text-left text-xs font-medium text-dark_accent underline underline-offset-2 transition-colors hover:text-primary-100 ${coarseTouchTarget}`}
      >
        {hiddenShown ? 'Collapse' : 'Show'} {hiddenPrompts.length} hidden item
        {hiddenPrompts.length === 1 ? '' : 's'}
      </button>

      {hiddenShown && hiddenList}
    </>
  );

  return (
    <section className="mb-4 last:mb-0">
      {heading}
      {itemList}
      <ChecklistAddRow phase={phase} placeholder={placeholder} />
      {hiddenBlock}
    </section>
  );
}
