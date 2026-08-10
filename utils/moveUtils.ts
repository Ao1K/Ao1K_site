const VALID_MOVE_BASES = new Set(['U', 'D', 'R', 'L', 'F', 'B', 'u', 'd', 'r', 'l', 'f', 'b', 'M', 'E', 'S', 'x', 'y', 'z']);

export type ParsedMove = { base: string; amount: number };

export function formatMove(base: string, amount: number): string {
  const normalized = amount % 4;

  if (normalized === 0) {
    return '';
  }

  if (normalized === 1) {
    return base;
  }

  if (normalized === 2) {
    return `${base}2`;
  }

  return `${base}'`;
}

export function parseMove(move: string): ParsedMove | null {
  if (!move) {
    return null;
  }

  const base = move.charAt(0);
  if (!VALID_MOVE_BASES.has(base)) {
    return null;
  }

  let index = 1;
  let amount = 1;

  const digit = move.charAt(index);
  if (digit === '2' || digit === '3') {
    amount = Number(digit);
    index += 1;
  }

  if (move.charAt(index) === "'") {
    amount = (4 - amount) % 4;
    index += 1;
  }

  if (index !== move.length) {
    return null;
  }

  const normalized = amount % 4;
  if (normalized === 0) {
    return null;
  }

  return { base, amount: normalized };
}

/**
 * Check for moves that cancel out or combine (ex1: U U' = '', ex2: U U = U2).
 */
export function combineMoves(moves: string[]): string[] {
  const stack: { move: string; parsed: ParsedMove | null }[] = [];

  for (const move of moves) {
    const parsed = parseMove(move);

    if (!parsed) {
      if (move) {
        stack.push({ move, parsed: null });
      }

      continue;
    }

    const last = stack[stack.length - 1];
    const lastParsed = last?.parsed;

    if (lastParsed && lastParsed.base === parsed.base) {
      const total = (lastParsed.amount + parsed.amount) % 4;

      if (total === 0) {
        stack.pop();
      } else {
        stack[stack.length - 1] = {
          move: formatMove(lastParsed.base, total),
          parsed: { base: lastParsed.base, amount: total },
        };
      }
    } else {
      // keep original notation when no merge occurs so single moves like R3 stay intact
      stack.push({
        move,
        parsed: { base: parsed.base, amount: parsed.amount },
      });
    }
  }

  return stack.map(entry => entry.move);
}
