import { db } from './db';
import type { NotimerSolve, dbCheck } from './db';

export async function getPreviousSolve(searchIndex: number): Promise<NotimerSolve | undefined> {
  let i = searchIndex;

  while (i >= 0) {
    const result = await db.solveTable.get(i);
    if (result) {
      return result;
    }
    i--;
  }

  return undefined;
}

export async function getNextSolve(searchIndex: number): Promise<NotimerSolve | undefined> {
  let i = searchIndex;
  const totalEntries = await db.solveTable.count();

  while (i <= totalEntries) {
    const result = await db.solveTable.get(i);
    if (result) {
      return result;
    }
    i++;
  }

  return undefined;
}

export async function getLastSolve(): Promise<NotimerSolve | undefined> {
  const result = await db.solveTable
    .orderBy('id')
    .reverse()
    .limit(1)
    .first();

  return result;
}

export async function getSolve(searchIndex: number): Promise<NotimerSolve | undefined> {
  const result = await db.solveTable.get(searchIndex);

  return result;
}


export async function getChecks(id: number): Promise<dbCheck[]> {
  const checks = await db.checkTable
    .where('notimerSolveId')
    .equals(id)
    .toArray();
  return checks;
}
