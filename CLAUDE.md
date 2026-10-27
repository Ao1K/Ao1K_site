

# Overview

This file contains an overview of the style and core concepts of the project. Important note: don't write comments.

# Conceptual Understanding

This project is for a speed cubing website.

## Terminology

Cubing terms or jargon may be used in user prompts. When this occurs, refer to `/docs/cubing-term-definitions.md`.
If the jargon is not listed, ask for a definition and then add it.

"Slot" specifically only refers to one of the four locations that an f2l pair gets solved into (front-right, back-right, front-left, or back-left). Do not use the word "slot" to refer to other types of locations or any other concept.

The favorite button used throughout the site can also be called the parrot. It's not the "heart" or the "star".

# Style

## Comments

IMPORTANT: NEVER WRITE COMMENTS UNLESS ASKED. Code should be self descriptive. If you think a comment is crucial, request the user for permission to write a brief comment. Approved comments have the first sentence starting in lowercase.

Just fix issues. Don't write comments explaining the problem or solution.

Example of good:
Code that describes itself without the need for comments.

Example of good approved comment:
// sentence one. Sentence two.

## State management style

Remember: you might not need an effect. useEffect and similar effect-based triggers are generally a lazy approach. Don't be lazy. Avoid using effects by doing one or more of the following:

1. Trigger stateful changes through events
2. Pass state in as props to a component
3. Simply recalculating values every render

## Keep simple modifications in-line

Avoid functions that needlessly abstract a simple concept. One-line functions should usually be avoided for this reason. Instead, keep the modifications in-line. 

## When clarity needed, return a named variable

If a function has multiple different return blocks, assign the return value to a constant before returning it. The name shows the reader what the function is returning without needing a comment. If it is obvious what a return is doing, this isn't needed.

# Architecture

## Directory Structure

- `/app` Next.js App Router pages and API routes
- `/components` React components, organized by page (`/recon`, `/changeblog`, `/notimer`, `/algs`)
- `/composables` React hooks and business logic utilities
- `/utils` General utilities and data (algorithm database, constants)
- `/scripts` Development scripts (algorithm sorting, combo generation)
- `/docs` Project documentation markdown files
- `/amplify` Backend AWS Amplify Gen 2 infra-as-code files

## Noteworthy files
  - See /docs/package-scripts.md for a a description of each script in package.json.
  - Use /docs/writing-spec-sheets.md for instructions on writing specifications.
  - Use /utils/sharedConstants.tsx for constants that are used across the project.

## State Management

- **Cookie settings**: Cube colors and preferences with cross-tab sync via BroadcastChannel
- **Settings hooks**: `useSyncedSettings()`, `useCubeColors()`, `useShowControls()`, etc.

## Html Cube Runtime

There's a small local bundle used for rendering server-side svg cube images and videos. 

If you modify any of that pipeline, such as:
`cubeSceneEntry.client.ts`, `cubeSceneRuntime.client.ts`, `cubeSvgRender.ts`, `cubeSceneIsland.ts`, or `cubeMoves.ts`,
then be sure to run `build-cube-runtime` and `verify-cube-parity` from the package.json.

# Testing

When driving a browser and testing the Recon page, you may need to set a cookie for infoPanelDismissed_v1 so that the info panel does not interfere with the test. The info panel takes up a lot of the screen. 

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
