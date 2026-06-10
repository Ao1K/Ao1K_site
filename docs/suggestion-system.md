# The Suggestion System

This describes how algorithm suggestions surface in the reconstruction editor: where they
come from, how they reach the text editor, and how the inline "ghost" preview is rendered
and accepted. It stays at the systems level — the inner workings of the suggestion *cards*
and of the alg-matching pipeline itself are out of scope.

## The pieces

| Piece | File | Role |
|-------|------|------|
| Page logic | `_PageContent.tsx` | Computes suggestions from cube state, owns the suggestion list |
| Text editor | `MovesTextEditor.tsx` | Owns the contentEditable, paints text, measures the ghost anchor, handles accept |
| Manager | `SuggestionManager.tsx` | Decides what (if anything) to show; derives the remaining text; portals the UI |
| Ghost | `SuggestionGhost.tsx` | The absolutely-positioned gray preview text |
| Cards | `SuggestionBox.tsx` / `SuggestionCard.tsx` | The popup list of selectable suggestions |

The guiding principle of the current design: **the editable HTML never contains suggestion
markup.** The preview is a pure overlay derived from props. Showing, hiding, or accepting a
suggestion therefore never rewrites the contentEditable and never disturbs the caret.

## Where suggestions come from

Suggestions are a function of the cube state, not of the text directly. The flow:

1. The user edits the solution. The editor parses each line into moves and calls
   `trackMoves(...)` back up to `_PageContent`.
2. `_PageContent` replays scramble + solution moves into the cube model, asks the
   interpreter which steps are complete, and asks it for alg suggestions for the current
   state (`getStepsCompleted` → `getAlgSuggestions`).
3. The resulting `Suggestion[]` is stored in `suggestionsRef` and pushed into state. That
   ref is handed straight back down to the editor as `suggestionsRef`.

Two important gates live here:

- **Empty-line only.** Suggestions are generated only when the caret sits on an *empty*
  line (`trackMoves` → `handleEmptyLineSuggestions`). This is a deliberate UX choice — it
  keeps reconstructions clean and avoids mid-line noise — and it means "the active line"
  for suggestion purposes is effectively the line you're about to type on.
- **Change detection.** New suggestions only propagate when the alg list actually changes,
  so unrelated edits don't churn the UI.

The key consequence for everything downstream: the suggestion list is just data flowing
in as a prop. It can lag a beat behind the keystroke that triggered it, which matters for
timing (see "Avoiding flutter").

## What the manager decides

`SuggestionManager` is a child of the editor and re-renders whenever the editor re-renders.
It holds only two pieces of genuine state:

- `selectedOriginalIndex` — which suggestion the user has highlighted (arrow keys / hover).
- `dismissed` — whether the user pressed Esc on the current line.

Everything else is **derived every render** from props (per the project's preference for
avoiding `useState`/`useEffect`):

- **Visible text.** `getLineText(activeLineHtml)` strips the painted markup and normalizes
  entities to recover exactly what the user sees on the active line. This is the single
  source of truth for matching and positioning.
- **Filtering.** A suggestion is shown only if `resolveRemaining(alg, visibleText)` is
  non-empty — i.e. the alg starts with what's typed and has more to go. Lines containing
  comments suppress suggestions entirely.
- **Remaining text.** For the selected suggestion, `remaining = alg.slice(visibleText.length)`
  when the alg starts with the visible text, else `''`.
- **`shouldShow`.** True only for the solution editor, when there are matching suggestions,
  it isn't dismissed, and there's remaining text to preview.

The selection and dismissal flags reset themselves when the underlying content changes: a
new suggestion set clears the highlight and un-dismisses; a change to the active line's
moves un-dismisses.

### Why `remaining` is a raw suffix

Computing the preview as a literal `alg.slice(visibleText.length)` is what makes spacing
correct without special cases:

- Typed `R` → remaining `" U R'"` (the leading space is part of the alg) → reads `R U R'`.
- Typed `R ` (trailing space already there) → remaining `"U R'"` (no extra space).
- Mid-move `R U R` → remaining `"' U'"` → reads `R U R' U'`.

Because the gap between typed text and preview lives inside the alg string itself, there's
no separate "prepend a space?" flag to get wrong, and the manager and the card list can
never disagree about what's being matched (both call `resolveRemaining`).

## The ghost: rendering and positioning

`SuggestionGhost` is an absolutely-positioned, `pointer-events: none` element portaled into
the suggestion overlay (a sibling of the contentEditable, outside it). It renders the
`remaining` string in the suggestion color, plus an optional Tab-hint image on hardware
keyboards. It is styled to match the editor's font metrics so glyph widths line up with the
real text.

Its position comes from the editor, not the manager. `MovesTextEditor.measureCaretRect`
computes an **anchor at the end of the active line's typed text** and pushes
`(left, top, height)` into the manager via the imperative `updateCaretRect`. Pushing it
imperatively (rather than as React state in the editor) is deliberate: it re-renders only
the ghost, never the contentEditable.

Two subtleties in the anchor:

- **End of text, not the caret.** The ghost continues the whole line, so it anchors to the
  end of the typed text — a collapsed `Range` at the end of the line's last text node,
  with the last painted span's right edge as a fallback. Moving the caret back into the
  line with the arrow keys must *not* drag the ghost left with it.
- **Scroll.** Vertical scroll is normalized out; the overlay re-applies it via the
  `--solution-scroll-top` CSS variable so the ghost tracks scrolling like the card popup.

## Accepting

Acceptance comes from two places: pressing **Tab** (handled in the editor's keydown logic)
or clicking a card (routed through the manager's `onAcceptSuggestion`). Both funnel into
`MovesTextEditor.handleSuggestionAccept`, which:

1. Reads the exact text to insert from `getAcceptText()` — this is just `remaining`, which
   already carries its own leading space when one is needed.
2. **Appends it at the end of the active line** (before the trailing `<br>`), where the
   ghost is anchored — not at the live caret, which may have been moved back. It then drops
   the caret marker right after the inserted text.
3. Runs the normal `handleInput()` paint path once, exactly as if the text had been typed.

So accepting is an ordinary edit. There's no special markup to splice in or strip out, and
the result is indistinguishable from typing the moves manually.

Tab has a two-stage meaning, resolved against the manager's handle:

- If a ghost is currently visible (`canAcceptSuggestion`), Tab accepts it.
- If the user previously dismissed with Esc but suggestions still exist
  (`canShowSuggestion`), Tab re-shows instead of accepting.

Esc dismisses (`dismissSuggestion`), which is pure state — no HTML surgery.

## Avoiding flutter (render timing)

The ghost has two visual inputs that must agree on every frame: the `remaining` **text**
and the **anchor x**. They're produced on different paths:

- `remaining` recalculates synchronously in the render that `setHTML` triggers (it depends
  on `activeLineHtml`, already updated).
- the anchor is a DOM measurement, which can only happen *after* the new text is painted.

If the measurement runs in a plain `useEffect`, the browser paints one frame with the new
(shorter) text still sitting at the old anchor, then snaps — a visible sideways jitter on
every keystroke. The fix is to run the measurement in a **layout effect**
(`useIsomorphicLayoutEffect` keyed on `html`): it fires after the DOM updates but before
paint, and the resulting anchor `setState` is flushed into the same commit. The browser
only ever paints the final, consistent state.

## Why `passURLupdate` stays clean

Because the preview is never part of the editable HTML, the editor's `innerText` is already
free of suggestion text. Serializing the solution to the URL needs no strip/restore dance —
it just reads `innerText`. This is the payoff of keeping the ghost as a pure overlay.

## Quick reference: the data flow

```
user types
  → MovesTextEditor parses line, trackMoves() → _PageContent
  → cube replay → interpreter → Suggestion[] (empty-line gate, change detection)
  → suggestionsRef passed back down as a prop
  → SuggestionManager derives: visibleText, filtered list, remaining, shouldShow
  → MovesTextEditor.measureCaretRect (layout effect) pushes anchor → manager
  → SuggestionGhost renders `remaining` at the anchor; SuggestionBox lists the cards
Tab / click
  → handleSuggestionAccept appends `remaining` at end of line → normal paint path
```
