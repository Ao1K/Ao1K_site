export type PenaltyStatus = number | 'DNF' | 'untimed';

export const MAX_PLUS_TWO_PENALTY = 16;

export function parsePenaltyParam(penalty: string | null): PenaltyStatus {
  if (penalty === 'DNF' || penalty === 'untimed') {
    return penalty;
  }

  const parsedPenalty = parseInt(penalty ?? '', 10);
  const isValidPlusTwo = parsedPenalty > 0 && parsedPenalty <= MAX_PLUS_TWO_PENALTY && parsedPenalty % 2 === 0;
  return isValidPlusTwo ? parsedPenalty : 0;
}

export function formatTimeStat(solveTime: number | string, penaltyStatus: PenaltyStatus, unitSpace: string): string {
  if (penaltyStatus === 'DNF') return 'DNF';
  if (penaltyStatus === 'untimed') return 'Untimed';
  if (!solveTime) return '';
  if (penaltyStatus === 0) return `${solveTime}${unitSpace}sec`;

  const penalizedTime = Math.round((Number(solveTime) + penaltyStatus) * 1000) / 1000;
  return `${solveTime} + ${penaltyStatus} = ${penalizedTime}${unitSpace}sec`;
}
