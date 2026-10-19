---
name: new-lesson
description: Create an empty lesson stub for the /learn page. Use when the user asks to add, create, or start a new lesson (e.g. "new lesson for keyhole", "add a Sub-30 lesson on cross"). Writes only the title and audience — never lesson text.
---

# New lesson stub

Creates the three edits needed for a lesson to exist and route. No prose, no cube scenes, no headers.

## Required input

Two things, both from the user. Do not invent either.

1. **Lesson title** — as it appears in the page heading, Each Word Capitalized.
2. **Audience** — either a seconds number, phrased by the user as "Sub 50", "sub-30", etc., or every cuber, phrased as "All", "all levels", "any speed". A number is stored as the integer; every cuber is stored as the string `"all"`.

If the user gave a title but no audience, ask for the audience before writing anything. If they gave an audience but no title, ask for the title. Ask both in one message if both are missing.

The audience is what orders lessons on the index page, so a lesson cannot be placed without it.

## Derived values

- **slug** — lowercase, spaces to hyphens, no punctuation. Ex: `Edge Orientation` → `eo` only if the user says so; otherwise `edge-orientation`. Ask if the user seems to want a short slug.
- **component name** — PascalCase of the slug. Ex: `edge-orientation` → `EdgeOrientation`.
- **file** — `components/learn/postContent/<slug>.tsx`.

## Edits

### 1. `components/learn/postContent/<slug>.tsx`

```tsx
import LessonBody from "../LessonBody";
import TitleBar from "../TitleBar";

export default function <ComponentName>() {
  return (
    <>
      <TitleBar title="<Title>" subtitle="" audience={<seconds>} />
      <LessonBody>
      </LessonBody>
    </>
  );
}
```

For an every-cuber audience, the prop is `audience="all"` instead.

Leave `subtitle` empty. Leave `LessonBody` empty.

### 2. `components/learn/lessons.ts`

Add an entry to the `lessons` array:

```ts
  {
    slug: "<slug>",
    title: "<Title>",
    description: "",
    category: "CFOP",
  },
```

`description` stays an empty string — it is reader-facing text, so a human writes it. Tell the user it is blank.

`category` defaults to `CFOP` unless the user names another one. If they name a category not already in the file, confirm the spelling with them.

**Placement:** within a category, entries run slowest audience first (higher `audience` seconds first). An `"all"` audience is the slowest and goes first of all. Read each existing lesson's `audience` from its `TitleBar` in `postContent/` to find the insert position. If the existing entries are already out of that order, insert by the rule anyway and say so — do not reorder the others without asking.

### 3. `app/learn/[slug]/page.tsx`

Add the import and the `lessonComponents` map entry:

```tsx
import <ComponentName> from "../../../components/learn/postContent/<slug>";
```

```tsx
const lessonComponents: Record<string, React.ComponentType> = {
  ...
  "<slug>": <ComponentName>,
};
```

Quote the key only if the slug contains a hyphen.

## Do not

- Write any lesson body text, headings, story paragraphs, quizzes, or cube scenes. `docs/lesson-style-guide.md` forbids AI-written reader-facing text. That includes the `description` field and the `subtitle`.
- Add comments.

## Finish

Run `pnpm tsc --noEmit` from the project root. Then tell the user the file path and that the title, audience, and routing are in place, with the body and description left empty for them.
