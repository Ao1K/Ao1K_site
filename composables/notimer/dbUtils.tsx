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
  // will return first solve located, starting at searchIndex
  let i = searchIndex;
  const totalEntries = await db.solveTable.count();

  while (i <= totalEntries) {
    const result = await db.solveTable.get(i);
    if (result) {
      console.log('getNextSolve', result);
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

export async function addCheck(check: dbCheck): Promise<void> {
  await db.checkTable.add(check);
}

export async function deleteCheck(id: number): Promise<void> {
  await db.checkTable.delete(id);
}

export async function updateCheck(id: number, check: dbCheck): Promise<void> {
  await db.checkTable.update(id, check);
}

export async function addSolve(solve: NotimerSolve): Promise<void> {
  await db.solveTable.add(solve);
}

export async function deleteSolve(id: number): Promise<void> {
  await db.solveTable.delete(id);
}

export async function updateSolve(id: number, solve: NotimerSolve): Promise<void> {
  await db.solveTable.update(id, solve);
}