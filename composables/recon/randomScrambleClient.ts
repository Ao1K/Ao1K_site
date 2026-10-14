const fetchRandomScramble = async (): Promise<string | null> => {
  try {
    const response = await fetch('/api/scramble/', { cache: 'no-store' });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    const scramble = (payload as { scramble?: unknown })?.scramble;
    return typeof scramble === 'string' ? scramble : null;
  } catch {
    return null;
  }
};

let prefetchedScramble: Promise<string | null> | null = null;

export const prefetchRandomScramble = () => {
  prefetchedScramble ??= fetchRandomScramble();
};

export const takeRandomScramble = () => {
  const scramble = prefetchedScramble ?? fetchRandomScramble();
  prefetchedScramble = fetchRandomScramble();
  return scramble;
};
