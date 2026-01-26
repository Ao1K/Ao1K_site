# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ao1K (Average of One Thousand) is a Rubik's cube reconstruction and analysis web application. Users input scrambles and solutions to visualize solves, detect solving steps, and receive algorithm suggestions.

## Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Run production build
npm run lint         # Run ESLint
npm run sort-algs    # Sort algorithm database (rawAlgs.tsx)
```

## Tech Stack

- **Next.js 15** with App Router (React 19, TypeScript)
- **Tailwind CSS** for styling
- **Three.js** + **cubing.js** for 3D cube visualization
- **AWS Amplify** for auth and storage (minimal usage currently)
- **Dexie** (IndexedDB wrapper) available for local storage on the "notimer" page

## Style

Typically only add comments for code that appears unintuitive. Start comments with lowercase text, example: `// correctly formatted comment`.

## Architecture

### Directory Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components, organized by page (`/recon`, `/changeblog`, `/notimer`)
- `/composables` - React hooks and business logic utilities
- `/utils` - General utilities and data (algorithm database, constants)
- `/scripts` - Development scripts (algorithm sorting, combo generation)

### Key Files

- `components/recon/_PageContent.tsx` - Main reconstruction page logic
- `composables/recon/SimpleCube.tsx` - Cube state model
- `composables/recon/SimpleCubeInterpreter.tsx` - Step detection (cross, F2L, LL)
- `composables/recon/validateTextInput.tsx` - Move input validation
- `utils/rawAlgs.tsx` - Algorithm database (542KB, large union types)

### State Management

- **URL-driven state**: Scramble, solution, time, title stored in URL query params
- **Custom URL encoding**: Spaces encoded as underscores for readability
- **Cookie settings**: Cube colors and preferences with cross-tab sync via BroadcastChannel
- **Settings hooks**: `useSyncedSettings()`, `useCubeColors()`, `useShowControls()`

### Algorithm Suggestion Pipeline

The algorithm suggestion system uses pattern-based matching to recommend algorithms based on the current cube state. The core insight is that cube positions can be represented as a 26-character hash string, enabling fast database lookups.

#### Core Concept: Hash-Based Pattern Matching

1. **Hash Representation**: Cube state encoded as 26 characters (12 edges + 8 corners + 6 centers)
2. **Rotation Normalization**: Colors mapped to "effective" colors based on cube rotation, so identical patterns match regardless of physical orientation
3. **Solved State Reference**: `'abcdefghijklehkbnqtwabcdef'` represents a solved cube

**How the hash works:**
- Each piece is identified by its colors (not location)
- For each piece, find its current position on the cube
- Encode that position as a character ('a' through 'x')
- Characters at the same index can be compared across states

#### F2L Suggestions (`ExactAlgSuggester` + `SimpleCubeInterpreter`)

For F2L, the system generates position-based queries:

1. **Query Generation** (`getQueriesForF2L`): For each unsolved slot:
   - Cross pieces → `must` stay solved (exact position match required)
   - Solved F2L pairs → `must` stay solved
   - Target slot → `must` match current piece positions

2. **Inverted Index Search** (`ExactAlgSuggester.searchByPosition`):
   - Pre-built index maps `(position, character) → [algorithm IDs]`
   - Query constraints: `must` (required), `may` (preferred), `not` (excluded)
   - Algorithms are pre-hashed by applying their inverse to a solved cube

3. **Filtering**: Remove redundant algs (longer algs that start with shorter ones without solving additional pieces)

4. **Scoring**: `AlgSpeedEstimator` estimates execution time for ranking

#### Last Layer Suggestions (`LLinterpreter` + `LLsuggester`)

For OLL/PLL, the system uses pattern matching on a 5x5 grid:

1. **Grid Generation** (`getLLcoloring`): Create 5x5 grid of LL sticker colors
   - Pattern mode: Top color = 1, others assigned dynamically (2-6)
   - Exact mode: Fixed color mapping (white=1, yellow=2, etc.)

2. **Case Identification** (`LLinterpreter.getStepInfo`):
   - Apply step-specific masks (OLL mask checks orientation, PLL mask checks permutation)
   - Compute canonical key: minimum base-6 integer across 4 rotations
   - Look up case index in pre-computed pattern JSON files

3. **AUF Calculation** (`LLsuggester`):
   - Track reference piece (green-white edge) location
   - `refPieceMovement`: Where the reference piece ends up after the alg
   - `minMovements`: Which rotations produce the canonical key
   - Calculate pre-AUF and post-AUF to align algorithm with current state

4. **Algorithm Selection**: Match case index to compiled alg database, apply AUF adjustments

#### Key Files

- `SimpleCube.tsx` - Cube state model (3x3 face arrays, move execution)
- `SimpleCubeInterpreter.tsx` - Hash generation, step detection, F2L query building, LL grid generation
- `ExactAlgSuggester.tsx` - Position-based inverted index for F2L algorithm search
- `LLinterpreter.tsx` - LL pattern matching, canonical key computation, case lookup
- `LLsuggester.tsx` - LL algorithm selection with pre/post AUF adjustment
- `AlgSpeedEstimator.tsx` - Algorithm execution time estimation for ranking

## Development Notes

- Mobile-first UI is a strict requirement
- All UI changes must work well on mobile devices
- Features should prioritize UX and be easily reachable
- Development branch is `development`; main branch is stable
