---
name: add-algs
description: Add new algs (OLL, PLL, ZBLL, F2L, ZBLS) to the autocomplete/suggestion system end to end - pick the raw data file, generate variations such as lefty mirrors, regenerate the righty/lefty lists, and compile into public/recon. Use when the user asks to add algs to an algset, or points at algs listed in todo.txt.
---

# Add algs to the autocomplete system

The pipeline is: raw data file -> (variations) -> `_righty` / `_lefty` lists -> compiled JSON in `public/recon`.
The header comment in `utils/rawAlgs.tsx` is the source of truth for the steps. Read it first in case it changed.

## 1. Collect the algs

- Get the algs from the user's message, or from `todo.txt` if the user points there (for example an "Add oll algs:" list).
- Get the algset (`oll`, `pll`, `zbll`, `f2l`, `zbls`). If the user didn't say and it isn't obvious from the source, ask.
- Don't judge what case an alg solves from memory. Let the compiler check the algs.

## 2. Decide on variations

If the user already said how to make variations, do that. Otherwise ask with AskUserQuestion before editing anything. Offer these options:

- **M mirror (lefty versions)** — the usual choice for OLL/PLL/ZBLL. Already automatic: `pnpm mirror-algs` writes the M mirror of every raw alg into the other-handed list. Nothing extra to add to the raw file.
- **M mirror, and also keep the lefty version in the righty list** — for lefty algs people use in righty solving. Add the alg to the step's `frequentLefty` list in `utils/frequentLeftAlgs.json`.
- **S mirror, inverse, or rotations (x/y/z)** — no script does these yet. See "Conversions without a script" below.
- **No variations**

More than one option can apply, so use `multiSelect: true`.

### Conversions without a script

Never convert algs by hand. Every variation must come from a script in the codebase.

If a requested conversion has no script, add one to `scripts/` before going further, and register it in `package.json` next to `mirror-algs`. Prefer extending `scripts/mirrorAlgs.ts` over writing a separate script when the conversion fits its structure. Reuse the existing move tables and helpers in `composables/recon/transformHTML.ts` (`replacementTable_S`, `replacementTable_X/Y/Z`, `reverseMove`) instead of writing new ones. Tell the user about the new script and get their approval of it before running it on real data.

## 3. Add the algs to the raw data file

- OLL / PLL / ZBLL: add plain strings to `utils/raw<STEP>data.json` (`rawOLLdata.json`, `rawPLLdata.json`, `rawZBLLdata.json`). Never edit the `_righty` / `_lefty` files by hand; step 4 regenerates them.
- F2L / ZBLS: add objects to `utils/rawGenericData.json` with the fields described in the `ExactAlg` interface and the header of `utils/rawAlgs.tsx`.
- Skip algs that are already in the file. Tell the user which ones were skipped.
- Use the Edit tool for these changes. Don't script edits.
- Run `pnpm sort-algs <raw file you edited>` (for example `pnpm sort-algs utils/rawOLLdata.json`) to restore sorted order. It only rewrites the files you pass.

## 4. Regenerate righty/lefty lists (LL sets only)

```
pnpm mirror-algs utils/raw<STEP>data.json
```

This rewrites `utils/raw<STEP>data_righty.json` and `_lefty.json` from scratch. An alg with no `l`/`L` moves counts as righty, and its M mirror goes to the lefty list. An alg with `l`/`L` gets flipped so that the righty list holds the righty form. Report the counts the script prints, and check that each new alg (and its mirror, if requested) shows up in the right list.

## 5. Compile

```
pnpm compile-algs <step>
```

Use `--dry-run` first if you are unsure what will be written. The output goes to `public/recon/compiled-<step>[-righty|-lefty]-algs.json`.

Read the log:
- `Repaired LL alg "X" to "Y"`: the compiler fixed an alg that broke F2L and wrote `scripts/output/repaired-<label>-algs.json`. The raw file still has the old alg. Show the user the repairs and ask if the raw file should take the repaired versions. If yes, update the raw file and go back to step 4.
- `does not preserve F2L and could not be repaired`: the alg is wrong or uses notation the parser can't read. Report it to the user. Don't guess a fix.
- `Invalid algorithm pattern detected`: too many leading U or y moves. Report it.

## 6. Finish

- Show `git diff --stat` for the raw and compiled files.
- If the algs came from `todo.txt`, ask the user before removing them from it.
- Stop here. Don't start the dev server or test the suggestions in the app unless the user asks.
