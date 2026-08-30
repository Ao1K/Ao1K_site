

# Overview

This file contains an overview of the style and core concepts of the project. Important note: don't write comments.

# Conceptual Understanding

This project is for a speed cubing website.

## Terminology

Cubing terms or jargon may be used in user prompts. When this occurs, refer to `/docs/cubing-term-definitions.md`.
If the jargon is not listed, ask for a definition and then add it.

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

## Architecture

### Directory Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components, organized by page (`/recon`, `/changeblog`, `/notimer`, `/algs`)
- `/composables` - React hooks and business logic utilities
- `/utils` - General utilities and data (algorithm database, constants)
- `/scripts` - Development scripts (algorithm sorting, combo generation)
- `/docs` - Project documentation markdown files.

### State Management

- **Cookie settings**: Cube colors and preferences with cross-tab sync via BroadcastChannel
- **Settings hooks**: `useSyncedSettings()`, `useCubeColors()`, `useShowControls()`, etc.
