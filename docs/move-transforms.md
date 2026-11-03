# Move Transforms

Behavior of the recon page transforms: mirror M, mirror S, rotate x/y/z, invert, and remove comments.

Code:
- `components/recon/_PageContent.tsx`: `handleTransform` picks the editor and passes it a transform.
- `components/recon/MovesTextEditor.tsx`: `handleTransformSelection` reads the selection, runs the transform, and selects the result.
- `composables/recon/editorDocument.ts`: the transforms themselves (`relabelSelectedMoves`, `rotateSelectedMoves`, `invertSelectedMoves`, `removeSelectedComments`). These work on plain lines of text and return the new lines and the new selection.

## Terms

- **Item**: any non-space piece of a line. A move, a paren, a reps count after a group, a comment, a hashtag, or invalid text. Rotations are moves.
- **Comment**: everything from `//` to the end of the line, except hashtags.
- **Hashtag**: `#` up to the next whitespace. A hashtag inside a comment is still a hashtag, not part of the comment.
- **Group**: a matched paren pair plus the reps count directly after the closing paren, like `(R U R')2`. Groups never span lines.
- **Invalid text**: anything that isn't one of the above. This includes unmatched parens and a reps count above the max.
- **Region**: the items a transform acts on.

## Rules

1. **Target editor.** The transform acts on the editor that holds the selection. If the selection is not inside a single editor, it acts on the solution.
2. **Region.** The region is every item the selection includes, even by one character. If the selection is only a caret, or is not inside the editor, the region is the whole editor.
3. **Groups are whole.** If the region touches any part of a group, the region grows to include the whole outermost group.
4. **Only the region changes.** Text outside the region is never edited.
5. **Selection after.** The new selection covers the whole region as it is after the transform. This includes anything the transform added, like a rotation prefix, and the space left by anything it deleted. The direction of the original selection is kept.
6. **No change, no effect.** If the transform leaves the text unchanged, the selection or caret stays as it was.
7. **One undo step.** Each transform is a single history entry.

## Transforms

### Mirror M, mirror S

Each move in the region, rotations included, is replaced by its mirror. Everything else, including spacing, is untouched.

### Rotate x, y, z

Each move in the region is relabeled for the new orientation. Then the rotation, followed by one space, is inserted once, on the first line of the region that has a move. It goes before that line's first move or group in the region.

If that first item is a rotation outside any group, it and the rotations right after it merge with the inserted rotation and are simplified. These are judged after relabeling. The run of rotations stops at the first item that is not a rotation. The run, plus the spaces inside it, is replaced by the merged result and one space. If the run reaches the end of the line, no space is added. The merged result can be empty, in which case no rotation is inserted and the run is removed.

The rotation always goes before a group, never inside one, so a repeated group never repeats the rotation.

### Invert

If the region has no moves, nothing happens, even if it has comments to delete.

Otherwise the region is replaced by its inverse:
- Moves and groups are reversed in order, at every nesting level.
- Each move is inverted.
- Each group keeps its reps count. Empty groups are kept.
- Comments, hashtags, and invalid text in the region are deleted.
- Items in the result are separated by single spaces.

The result is placed on the first line that has items in the region. Every line from there to the last line with items in the region is joined into that one line, and blank lines between them are removed. Text before the region on the first line and after it on the last line is kept. A space is added between the result and that text if there wasn't one. Example: lines `x y` and `z` become `z' y' x'`.

The new selection covers only the inverted result.

### Remove comments

Comments in the region are deleted. Hashtags inside those comments stay. If a deleted comment reaches the end of the line, the spaces before it are deleted too. All other items are untouched.
