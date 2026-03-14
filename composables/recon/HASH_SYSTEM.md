# Cube State Hash System

This document explains how the 26-character hash represents a Rubik's cube state in `SimpleCubeInterpreter.tsx`.

## Overview

The hash is a 26-character string where each character encodes both the **position** and **orientation** of a piece. Colors are normalized based on cube rotation. This means identical patterns produce identical hashes regardless of which physical colors are involved. For example, a solved cube will always give the same hash regardless of the rotation (viewing angle) of the cube. If the pattern is not perfectly symmetrical, such as most times when the cube isn't solved, then rotating the cube will often create a different hash. The pattern will have seemed to changed from that rotation.

```
Hash structure: [12 edges][8 corners][6 centers]
Indices:         0-11      12-19      20-25

Solved state: "abcdefghijklehkbnqtwabcdef"
```

## How It Works

### Step 1: Determine Cube Rotation

Read the U and F center colors to determine how the cube is rotated relative to standard orientation (white top, green front). 

"Rotation" is a human convention, and only describes the position of the cube relative to the observer. It changes nothing about the cube other than the direction facelets of the cubes pieces face relative to an observer outside the cube.

### Step 2: Get Ordered Piece List

In SimpleCubeInterpreter.tsx, `this.currentPieces` is a list that describes the pieces that make up the cube. The order of pieces in this list is predefined based on the colors of the cube. For example, the first piece in the list is always the green-white edge piece.

### Step 3: Map the Indices of `this.currentPieces`

Background: The hash stores position and orientation information for each piece, and each character in the hash represents a piece. However, the order of `this.currentPieces` and the order of pieces described by the hash are not the same. 

In this step, we create a map for the indices in `this.currentPieces`. For example, currentPieces[1] may be mapped to currentPieces[7]. This relationship between 1 and 7 is stored, and then we map currentPieces[2], and so on.

In `this.mapPiecesByColor`, we do the following by iterating over `this.currentPieces` in order. 
For piece of index 0:
1. Find the colors of the piece
2. Map those colors based on the cube rotation. These new colors are called the "effective" colors.
3. Search over `this.currentPieces` to find the piece with those effective colors, called the effective piece. Save the index of that piece, called the effective index.
4. We also store the color order of pieces for later.

Note: This can feel conterintuitive. We sometimes call the piece described by this color mapping as the "effective" piece, or the piece of certain "effective" colors, but the piece is really is those effective colors.


### Step 4: For Each Piece, Encode Position + Orientation

Based on the order of mapping made in Step 3, we iterate over each piece and generate a letter (a through x) that represents that piece's position and orientation.

We iterate over the mapping generated in Step 3. Continuing the example from earlier, currentPieces[1] was linked to currentPieces[7]. So we find the position and orientation of piece 7. These position and orientation values are hashed into a single letter. For details on how this is done, see below.

#### Edges (hash indices 0-11)

Each edge has a "primary" sticker. The hash character encodes which slot the edge occupies AND which direction the primary sticker faces.

```typescript
edgePieceDirections = {
  'UF': 0,  'UR': 1,  'UB': 2,  'UL': 3,   // U-layer edges
  'DF': 4,  'DR': 5,  'DB': 6,  'DL': 7,   // D-layer edges
  'FR': 8,  'FL': 9,  'BR': 10, 'BL': 11,  // E-layer edges
  'FU': 12, 'RU': 13, 'BU': 14, 'LU': 15,
  'FD': 16, 'RD': 17, 'BD': 18, 'LD': 19,
  'RF': 20, 'LF': 21, 'RB': 22, 'LB': 23
}
```

The value maps to a character: 0='a', 1='b', ..., 23='x'.

**Example:** If the UF edge (white-green) is in its home position with correct orientation, its hash character is 'a' (index 0). If it's flipped in place, the character would be 'm' (index 12, 'FU').

#### Corners (hash indices 12-19)

Corner encoding is: `(location_index * 3) + axis_index`

Location indices (sorted alphabetically by directions):
```typescript
cornerPieceDirections = {
  'FLU': 0,  // UFL slot
  'FRU': 1,  // UFR slot
  'BRU': 2,  // UBR slot
  'BLU': 3,  // UBL slot
  'DFR': 4,  // DFR slot
  'DFL': 5,  // DFL slot
  'BDL': 6,  // DBL slot
  'BDR': 7,  // DBR slot
}
```

Axis indices (which axis the primary sticker faces):
- x-axis (L/R faces): 0
- y-axis (U/D faces): 1
- z-axis (F/B faces): 2

**Example:** A corner in the UFR slot (location 1) with its primary sticker facing the U face (y-axis = 1):
- Character index = (1 * 3) + 1 = 4 → 'e'

#### Centers (hash indices 20-25)

Centers simply encode which direction they face:
```typescript
centerPieceDirections = {
  'U': 0, 'L': 1, 'F': 2, 'R': 3, 'B': 4, 'D': 5
}
```

By our own definition, centers don't move, so these are always 'abcdef'.

## Meaning of String Index in the Hash

### Question: 

The cube state hashes are strings, and each character represents a combination of position and orientation. But what does it mean to access hash[i]? What does the i'th member in the string represent?

### Answer:

i in hash[i] represents a piece of certain colors determined by the cube rotation (viewing angle). 

Example: The colors described hash[1] change based on the cube rotation. These colors are termed the effective colors, and the piece with these colors the effective piece. This does not mean the piece described by hash[1] isn't really those colors. It is. But to get which colored piece it represents, you need the rotation information.

Colors are mapped using `this.rotationColorMap`. 

## Checking If a Piece Is Solved

A piece is "solved" when its hash character matches the solved state's character at the same index:

```typescript
// Solved hash: "abcdefghijklehkbnqtwabcdef"
// If currentHash[4] === 'e', the DF edge is solved (in position with correct orientation)
```

## Usage in Algorithm Matching

To suggest algorithms:

1. Pre-compute each algorithm's hash by applying its **inverse** to a solved cube
2. Compare the current cube hash against algorithm hashes
3. If specific indices match (cross pieces, solved F2L pairs, target slot), the algorithm applies

This allows fast pattern matching without simulating moves.
