# Tapping a suggestion card without scrolling the page

## The problem

Mobile browsers keep the focused editable in view. Whenever they decide to re-check that,
they scroll whichever scroll ports they need to in order to reveal it.

While the user is typing a solution, the focused editable is the solution `MovesTextEditor`.
The suggestion cards are portaled to `#rich-solution-display`, outside that scroller, and hang
below the editor.

So tapping a card, even the favorite button, triggers a reveal of the editor, and the browser 
scrolls the page up to it. The favorite buttons move as the browser scrolls toward the 
solution box, even though the user isn't taking any action there.

Absorbing the scroll does not work. An element cannot be revealed by its own scroll box, so
giving the editable its own scroller just pushes the work up to the document.

## The approach

Focus the SuggestionCard upon clicking fav, thereby eliminating any reason for the browser to 
scroll.

The browser scrolls to whatever editable holds focus. If focus moves to something inside the card
before the reveal happens, the browser tries to reveal the card instead, but the scroll distance 
is zero because nothing has to move.

## The pieces

**`KeyboardKeeper`** (`components/recon/KeyboardKeeper.tsx`) is the focus target: a 1px,
transparent, `contentEditable` span inside each card. It exists to be an editing host and
nothing else. It is empty, so there is nothing to edit or to see, and `tabIndex={-1}` keeps it
out of the tab order.

Keeping it separate from the card is deliberate. When the card itself was the editing host, the
alg text was inside an editable, which brought selection handles, long-press menus and stray
carets, each of which had to be suppressed by hand. A dedicated element has none of that surface.

**`SuggestionCard`** focuses the keeper only for `touch` and `pen`, read from the `pointerdown`
that preceded the click. A mouse click never moves focus off the editor, so there is no reveal
to retarget, and a click with no preceding `pointerdown` came from the keyboard, where stealing
focus would be wrong.

**`MovesTextEditor`** owns getting focus back, through document-level listeners:

- `keydown` returns focus to the editor for any key except the ones the suggestion UI owns
  (`Tab`, `Escape`, `ArrowUp`, `ArrowDown`), bare modifiers, and anything with Ctrl/Meta/Alt.
  Focus moves before the browser picks an editing target, so the keystroke lands in the editor
  natively — nothing is replayed or synthesized.
- `compositionstart` returns focus before a composition produces any input, because
  `insertCompositionText` is not cancelable and could not be intercepted afterwards.
- `beforeinput` is a backstop for input that arrives with no keydown at all, such as voice input
  or the long-press paste menu. It cancels the input and returns focus. That input is dropped
  rather than redirected; the user's next keystroke goes to the right place.

The exclusion list is written as "keys the suggestion UI owns" rather than "keys that mean
typing" on purpose. Soft keyboards routinely report `Unidentified` or `keyCode 229` instead of a
real key, so a list of what counts as typing loses keystrokes for anything it fails to
anticipate. Listing what to exclude means an unrecognized key merely returns focus to the
editor, which is where typing belongs anyway.

## Restoring the caret

`#caretNode` is the editor's record of the caret position and survives the focus excursion. On
resume, `resumeTypingInEditor` puts the selection on that span **before** calling `focus()`.

The order matters. `focus()` synchronously fires `handleFocus`, whose job on a normal user focus
is to move the caret span to wherever the selection sits. If the selection is still wherever the
browser left it, that runs and rewrites `#caretNode` to the wrong place, and the caret is
restored faithfully to the wrong position. Placing the selection on the span first makes
`caretSpanNeedsMove()` compare equal offsets and return false, so the handler does nothing.

This is why there is no flag suppressing `handleFocus`. The ordering makes its existing condition
correct instead of overriding it.

## What to check when this breaks

- **Page scrolls on tap again.** Focus is not reaching the keeper. Check `document.activeElement`
  right after the tap.
- **Keyboard closes on tap.** The keeper stopped being an editing host — `contentEditable`
  removed, or the element is not rendered.
- **Caret returns to the wrong position.** The ordering in `resumeTypingInEditor` was disturbed,
  or the engine resets the selection during `focus()` rather than preserving one already inside
  the element.
- **First keystroke lost.** A key is being excluded that should return focus.

Keyboard visibility and scroll distance can only be checked on a real device; a desktop browser
with device emulation does not reproduce either.


## TODO

The added handling in MovesTextEditor should be tested on a real tablet or a device with 
touch controls as well as a keyboard.
