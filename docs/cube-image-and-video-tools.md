# The cube image and video tools

Two developer-only buttons on the reconstruction page turn the cube on screen into a
downloadable HTML file. One makes a still picture. One makes a short animation of a solve.
This document explains what they produce and how the drawing works, from the first click to
the finished file.

---

## 1. What comes out

| Tool | Button | Downloaded file | What it shows |
| --- | --- | --- | --- |
| Image tool | "Create HTML Image" | `ao1k-cube-<setup moves>-<date>.html` | A single picture of the cube in one position. |
| Video tool | "Create HTML Video" | `ao1k-solve-<scramble>-<date>.html` | The same picture, plus layer turns that play the solve. Click the cube to start and stop it. |

Both files are HTML. Everything they need is written inside them: the shapes, the colors, the
letters, and, for the video, the code that plays it. Open one from your own hard drive and it
works.

Each tool has a **Standalone HTML file** checkbox that picks between two output shapes:

- **Checked** — a complete HTML page you can open directly.
- **Unchecked** — a block of markup you can paste into an existing page.

```
   In the browser                       On the server                Downloaded
 ┌──────────────────────┐    ┌─────────────────────────────┐    ┌───────────────┐
 │ Dialog               │    │ compileStaticCubeImage()    │    │               │
 │  viewing angle       │    │            or               │    │  .html file   │
 │  colors              │──▶ │ compileCubeScene()          │──▶ │               │
 │  bright pieces       │    │                             │    │               │
 │  timing (video only) │    │ in app/devActions.ts        │    │               │
 └──────────────────────┘    └─────────────────────────────┘    └───────────────┘
```

---

## 2. The files involved

| File | Job |
| --- | --- |
| `components/recon/HtmlImageDialog.tsx` | The dialog for the image tool. |
| `components/recon/HtmlSceneDialog.tsx` | The dialog for the video tool, including per-line timing. |
| `app/devActions.ts` | Runs on the server. Wraps the drawing in an HTML page and shrinks the text. |
| `app/devActionTypes.ts` | The list of settings each tool sends to the server. |
| `utils/cubeSvgRender.ts` | The drawing itself. Works out where every shape ends up and what color it is. |
| `utils/cubeSceneRuntime.ts` | Writes out the code that goes inside the video file so it can redraw itself while it plays. |
| `components/recon/UnfoldedCube.tsx` | The flat map of the six faces you click to choose which pieces stay bright. |
| `composables/recon/autoHighlight.ts` | Picks the bright pieces for each line of the video before you edit them. |

---

## 3. What the cube is made of

The cube is 26 small cubes. The code calls each one a **cubie**. The center position of the
3x3x3 block stays empty, which leaves 26 of the 27 positions filled.

Each cubie shows between one and three colored squares, one per side that faces outward. Each
of those squares is a **sticker**. A solved cube has 54 stickers.

The drawing uses its own unit of length. One cubie is 100 units wide, so the whole cube is 300
units across, and it is drawn inside a square picture 640 units on each side.

```
 One slice of the cube, seen from the side:

    ░░░░░░  ░░░░░░  ░░░░░░       floating squares, 94 units wide,
       │       │       │         55% solid
       │       │       │
       │       │       │         100 units of gap
       │       │       │
    ▄▄▄▄▄▄  ▄▄▄▄▄▄  ▄▄▄▄▄▄       stickers on the top face, 100 units
   ┌───────┬───────┬───────┐     wide, with a 3-unit black border
   │       │       │       │
   │       │       │       │     each cubie is 100 units on a side
   ├───────┼───────┼───────┤
   │       │       │       │
   │       │       │       │     the whole block is 300 units across
   ├───────┼───────┼───────┤
   │       │       │       │
   │       │       │       │
   └───────┴───────┴───────┘
```

---

## 4. How the picture gets drawn

Everything in the picture is a flat four-cornered shape: a sticker, a floating square, or a
letter. The drawing works out where the four corners of each shape land on the picture, then
writes the shapes into the file in the correct order.

The output format is SVG. SVG describes a picture as a list of shapes written as text, and
browsers draw it directly. A sticker becomes two shapes in that list: a square in the border
color, and the colored square laid on top of it, 3 units smaller on every side. The border is
the rim of the first square left uncovered by the second.

### The five steps

```
 1. Start with the four corners of one flat square.
    A sticker's corners are (0,0), (100,0), (100,100) and (0,100).
         │
         ▼
 2. Move the square onto the correct side of its cubie, then move the
    cubie into its slot in the 300-unit cube. A video file also applies
    the layer turns this cubie has already been through.
         │
         ▼
 3. Shrink the whole cube to 85%, tilt it by the elevation and azimuth
    angles, and center it in the 640-unit picture.
         │
         ▼
 4. Turn depth into size. A corner further from the viewer is divided by
    a larger number, so it lands nearer the middle of the picture and the
    whole shape looks smaller.
         │
         ▼
 5. Sort every shape by depth and write them out farthest first.
```

### How steps 2 to 4 are stored

Each of those movements is stored as a **matrix**: a table of 16 numbers that describes a
shift, a rotation, a size change, or a combination of all three. Apply a matrix to a corner and
you get that corner's new position. Multiply two matrices together and you get one matrix that
does both movements, which is how a whole chain collapses into a single table of numbers.

The chain runs in this order. The last two columns give the name each link has in
`utils/cubeSvgRender.ts` and the name it has inside a downloaded video file.

| Order | Link | What it does | In the source | In the video file |
| --- | --- | --- | --- | --- |
| 1 | Square onto its cubie side | Rotates a flat square to face up, down, front, back, left or right, and pushes it out to the cubie's surface. | `faceLocal`, `hintLocal` | `FACE_M`, `HINT_M` |
| 2 | Cubie into its slot | Shifts the cubie to one of the 26 positions in the 300-unit cube. | `cubiePlacement` | `place` |
| 3 | Turns already completed | Every layer turn this cubie has been through so far. Video only. | | folded into `mat` |
| 4 | Turn part-way through | The fraction of the layer turn playing right now. Video only. | | `live` |
| 5 | Whole cube's size and angle | 85% size, then the elevation and azimuth tilts, then centering in the picture. | `placement` | `PLACE` |
| 6 | Depth into size | The division described in step 4. The viewer sits 1000 units back. | `projection` | `PROJ` |

In a video file, links 2 and 3 share one table of numbers called `mat`. It starts as the
cubie's slot position, and each completed turn is multiplied into it. The untouched slot
position stays available as `place`, so resetting to the scramble is one assignment.

### Which shapes get drawn

- **Stickers** are always drawn, including the ones on the far side of the cube facing away
  from you. They are drawn so that a bright piece on the far side shows through the muted,
  see-through pieces in front of it.
- **Floating squares** are drawn only when their front faces the viewer. A floating square sits
  100 units outside the cube. Drawing a rear-facing one would put it between you and the cube,
  covering what you are looking at.
- **Letters** are drawn only when their front faces the viewer, for the same reason.

Whether a shape faces the viewer is decided from the shape itself after step 4: take its top
edge and its left edge on the finished picture, and check which way the corner between them
bends.

### Drawing order

Every shape is tagged with the depth of its middle point, measured after step 3 and before step 4.
The list is sorted from lowest depth to highest, and written out in that order. A browser draws
an SVG list from first to last, so the shapes furthest from you get covered by the ones nearer
to you.

```
 depth:   -180        -40         +90        +160
            │           │           │           │
            ▼           ▼           ▼           ▼
        written     written     written     written
         first      second       third       last
       (farthest)                          (nearest)
```

---

## 5. The floating squares

Turning on "Include floating facelets" adds one extra square per sticker. Each one is a copy of
its sticker's color, 94 units across, sitting 100 units outside the cube, 55% solid, and edged
with a thin dark line.

They let the reader see the colors on the three faces pointing away from them.

---

## 6. The face letters

Turning on "Include face direction labels" adds six letters — U, D, R, L, F and B — floating 50
units outside the middle of each face. Each letter is written as text, white with a black
outline, drawn inside a 150-unit square, in whatever sans-serif font the reader's browser uses.
The letters move with the cube when it is tilted, and stay still when layers turn.

---

## 7. Colors and muting

Every sticker color is worked out twice up front, once bright and once muted:

| Shape | Border | Inside | Opacity |
| --- | --- | --- | --- |
| Bright sticker | black | the sticker color | 100% |
| Muted sticker | shade over black | shade over the sticker color | your opacity setting |
| Bright floating square | dark edge over the sticker color | the sticker color | 55% |
| Muted floating square | shade over that edge | shade over the sticker color | 55% of your opacity setting |

"Shade over X" means the shade color is laid on top of X and the two are blended using the
shade color's transparency. A shade color that is fully transparent leaves X alone. A shade
color that is fully opaque replaces X.

Each shape is drawn with a single number between 0 and 1 that says how muted it is. At 0 it
uses the bright row of the table. At 1 it uses the muted row. Values in between blend the two,
which is how the video tool fades a piece from bright to muted over a third of a second.

---

## 8. The image tool, start to finish

1. You open the dialog from the reconstruction page. It receives the cube's current state: the
   color of all 54 stickers.
2. You choose the angle, the colors, and which pieces stay bright.
3. You press **Download HTML**. The dialog sends the state and every setting to
   `compileStaticCubeImage` on the server.
4. The server runs the five steps in section 5 once, producing a list of shapes.
5. It wraps the list in an HTML page, shrinks the text, and returns it to the browser.
6. The browser saves it, named after the setup moves and the current time, for example
   `ao1k-cube-R_U_Rpr-20260831-1432.html`.

The resulting file holds one list of shapes and a little styling. Opening it shows a picture.

---

## 9. The video tool, start to finish

### Splitting the solve into lines

The dialog reads the solution as a list of lines. Each line is one step of the solve, for
example the cross or one F2L pair. For each line you get:

- **A share of the total time**, shown as a percentage. The starting split is worked out from
  the number of moves in the line and how fast that kind of step is usually turned, so a cross
  gets more seconds per move than a last-layer algorithm.
- **A pause before the moves start**, so the reader can look at the position before it changes.
- **Which pieces stay bright during that line**, filled in automatically from what the step
  solves, and editable by clicking the flat cube map.

You also set the total length of the whole animation in seconds. It starts at the real time the
solve took, when the reconstruction has a split for every line. Otherwise it starts at the sum
of the estimates described above.

```
 the total length, split between the lines by percentage
 ┌───────────────────────────────┬──────────────────────────────┐
 │  line 1: cross                │  line 2: first pair          │
 │  ├── pause ──┼──── moves ───┤ │  ├─ pause ─┼──── moves ────┤ │
 └───────────────────────────────┴──────────────────────────────┘

 the pieces that stay bright can change at the start of each line
```

Within a line, the time left after the pause is divided among that line's moves. A quarter turn
gets a smaller share than a half turn, and every move gets at least 50 milliseconds.

### Combining U and D

A cuber can flick the top and bottom layers at once, so the dialog has a **Combine UD** setting
that plays a `U` sitting next to a `D` as one turn. It is on when the solution has such a pair
and greyed out when it does not.

Only single flicks pair up. `U2` and `D` cannot always be done together, so a pair is left as
two separate turns if either move is anything other than `U`, `U'`, `D` or `D'`. Pairing is
greedy and stays inside one line: in `U D U'` the first two combine and the `U'` plays on its
own.

A combined pair counts as one turn when the time inside a line is divided up, so combining
shortens nothing — the line still fills its share of the total, with more time spent on each
remaining turn.

### What the server writes into the file

`compileCubeScene` writes four things into one HTML page:

1. **Numbers.** The four fixed matrices from section 5 (links 1, 2, 5 and 6), both color tables
   from section 8, the 26 cubies with their starting positions and sticker colors, and the six
   letters. All calculated on the server and written out as plain lists of numbers.
2. **Drawing code.** A copy of steps 2 to 5 from section 5, written in JavaScript, so the file
   can produce a fresh list of shapes whenever it needs one.
3. **The move list.** Each line's moves as a list of groups, how many milliseconds each group
   takes, the pause before the line, and which pieces stay bright. A group holds one move,
   or two when Combine UD paired them.
4. **Playback code.** The part that decides what happens next and when.

### Playing a turn

Every layer turn is a rotation of some of the 26 cubies around the middle of the cube. Which
cubies move is decided by the move letter: `R` moves the nine cubies on the right, `M` moves the
nine in the middle vertical slice, `y` moves all 26, and so on.

While a turn is playing, a part-way rotation is applied to the moving cubies. When the turn
finishes, that rotation is folded into the cubie's stored `mat` and the part-way rotation is
cleared. Each cubie also stores which slot it now occupies, so the next move can tell whether
this cubie is one of the ones it moves.

A group of two moves works the same way, once per move, over the same stretch of time. The two
layers never share a cubie, so each moving cubie still carries a single part-way rotation.

### The frame loop

The file asks the browser for a drawing opportunity as often as the screen refreshes, commonly
60 times a second. Each time it gets one:

```
 ┌──▶ browser is ready for the next frame
 │            │
 │            ▼
 │    Is a turn playing?
 │      yes ─▶ work out how far through it is,
 │             set the part-way rotation on the moving cubies.
 │             If it just finished, fold the rotation in and
 │             start whatever comes next.
 │            │
 │            ▼
 │    Is any piece fading between bright and muted?
 │      yes ─▶ move each one a step further along its fade.
 │            │
 │            ▼
 │    Redraw: run steps 2 to 5, and replace the picture
 │    with the new list of shapes.
 │            │
 │            ▼
 │    Is anything still moving?
 │            │
 └─── yes ────┤
              │
              no
              ▼
       Stop asking for frames. The last picture stays on screen.
```

Two effects of this design:

- The file draws only while something is moving.
- Browsers stop offering frames to hidden tabs, so playback waits at whatever point it reached
  and carries on when the tab is visible again.

### Smooth timing

A turn that moved at a constant speed would start and stop abruptly. The turn follows a curve
instead: slow at the start, fastest in the middle, slow at the end. To find the position on
that curve, the file starts with the range 0 to 1 and halves it 24 times, which pins the answer
down far more finely than the picture can show.

Bright-to-muted fades use a second curve, faster at the start and gentler at the end, and take
300 milliseconds.

### The controls in the finished file

| Part | Behavior |
| --- | --- |
| Click anywhere on the cube | Starts and stops playback. |
| Dark overlay with a white triangle | Appears while stopped. Fades away while playing. |
| Progress bar | Optional. A red bar along the bottom that fills as the moves play. |
| Loop | Optional. Waits one second at the end, resets to the scramble, waits six-tenths of a second, and plays again. |
| Start highlighted | Optional. Applies the first line's bright pieces immediately, before any moves. |

---

## 12. Why the output is built this way

Every shape in the finished picture is flat, and its four corner positions are worked out by the
code before the browser sees them. The browser then fills in colors between the corners, which
every browser does the same way.

An earlier version handed the browser 3D instructions and let it do the arithmetic. Firefox
flickered during turns, so the arithmetic moved into the file.
