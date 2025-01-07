type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

// Check if two matrices are equal
function matricesAreEqual(a: Matrix3x3, b: Matrix3x3): boolean {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (a[i][j] !== b[i][j]) {
        return false;
      }
    }
  }
  return true;
}

// Find minimal sequence to match a given rotation matrix
function findMinimalSequence(target: Matrix3x3, rotations: any): string[] {
  const moves = Object.keys(rotations);


  // Try all single moves
  for (const move of moves) {
    if (matricesAreEqual(rotations[move], target)) {
      return [move];
    }
  }

  // Try all combinations of two moves
  for (const move1 of moves) {
    for (const move2 of moves) {
      const combinedMatrix = multiplyMatrices(rotations[move1], rotations[move2]);
      if (matricesAreEqual(combinedMatrix, target)) {
        return [move1, move2];
      }
    }
  }

  console.error("No match found for matrix:", target);
  return [];
}

// Multiply two 3x3 matrices (reuse from earlier code)
function multiplyMatrices(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  const result: Matrix3x3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return result;
}

export default function simplifyRotations(sequence: string): string[] {
  // assumes no leading or trailing spaces in sequence

  const moves = sequence.split(" ");
  const rotations: { [key: string]: Matrix3x3 } = {
    "": [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ],
    "x": [
      [1, 0, 0],
      [0, 0, -1],
      [0, 1, 0]
    ],
    "x'": [
      [1, 0, 0],
      [0, 0, 1],
      [0, -1, 0]
    ],
    "x2": [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, -1]
    ],
    "y": [
      [0, 0, 1],
      [0, 1, 0],
      [-1, 0, 0]
    ],
    "y'": [
      [0, 0, -1],
      [0, 1, 0],
      [1, 0, 0]
    ],
    "y2": [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1]
    ],
    "z": [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1]
    ],
    "z'": [
      [0, 1, 0],
      [-1, 0, 0],
      [0, 0, 1]
    ],
    "z2": [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1]
    ]
  };
  
  const rotationSortOrder_X = ["", "x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];
  const rotationSortOrder_Y = ["", "y", "y'", "y2", "x", "x'", "x2", "z", "z'", "z2"];
  const rotationSortOrder_Z = ["", "z", "z'", "z2", "x", "x'", "x2", "y", "y'", "y2"];

  const rotationSortOrders: { [key: string]: string[] } = {
    "x": rotationSortOrder_X,
    "y": rotationSortOrder_Y,
    "z": rotationSortOrder_Z
  };
  const firstLetter = sequence.trim()[0]; // would break if space is inputted as first char

  const sortedRotations = Object.fromEntries(
    rotationSortOrders[firstLetter].map(key => [key, rotations[key]])
  );


  let currentMatrix: Matrix3x3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];

  for (const move of moves) {
    currentMatrix = multiplyMatrices(currentMatrix, rotations[move]);
  }

  const simplifiedSequence = findMinimalSequence(currentMatrix, sortedRotations);
  return simplifiedSequence;
}

