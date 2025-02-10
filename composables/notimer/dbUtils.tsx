import { db } from './db';
import type { NotimerSolve, newNotimerSolve, dbCheck, CheckTemplate } from './db';

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
  const lastSolve = await db.solveTable
    .orderBy('id')
    .last();

  return lastSolve;
}

export async function getLastCheck(): Promise<dbCheck | undefined> {
  const lastCheck = await db.checkTable
    .orderBy('id')
    .last();

  return lastCheck;
}

export async function getLastCheckTemplate(): Promise<CheckTemplate | undefined> {
  const lastTemplate = await db.checkTemplatesTable
    .orderBy('id')
    .last();

  return lastTemplate;
}

export async function getChecks(solveID: number): Promise<dbCheck[]> {
  const checks = await db.checkTable
    .where('notimerSolveId')
    .equals(solveID)
    .toArray();
  return checks;
}



// CRUD

// Check functions
export async function addCheck(check: dbCheck | Omit<dbCheck, "id">): Promise<void> {
  await db.checkTable.add(check);
}

export async function getSolve(searchIndex: number): Promise<NotimerSolve | undefined> {
  const result = await db.solveTable.get(searchIndex);

  return result;
}

export async function deleteCheck(id: number): Promise<void> {
  await db.checkTable.delete(id);
}

export async function updateCheck(id: number, check: dbCheck): Promise<void> {
  await db.checkTable.update(id, check);
}

// NotimerSolve functions
export async function addSolve(solve: NotimerSolve | newNotimerSolve): Promise<void> {
  await db.solveTable.add(solve);
}

export async function deleteSolve(id: number): Promise<void> {
  await db.solveTable.delete(id);
}

export async function updateSolve(id: number, solve: NotimerSolve): Promise<void> {
  await db.solveTable.update(id, solve);
}

// CheckTemplate functions
export async function addCheckTemplate(template: CheckTemplate | string): Promise<void> {
  let t;
  // convert template to CheckTemplate type
  if (typeof template === 'string') {
    t = { text: template };
  } else {
    t = template;
  }
  console.log('t:', t);
  await db.checkTemplatesTable.add(t);
}

export async function getCheckTemplate(checkTemplateId?: number, checkTemplateText?: string): Promise<CheckTemplate | undefined> {
  let result;
  
  if (checkTemplateId) {
    result = await db.checkTemplatesTable.get(checkTemplateId);

  } else if (checkTemplateText || checkTemplateText === '') {
    result = await db.checkTemplatesTable
      .where('text')
      .equals(checkTemplateText)
      .last(); // TODO: not obvious to me or user that it should be first or last
  }
  
  return result;
}

export async function deleteCheckTemplate(id: number): Promise<void> {
  await db.checkTemplatesTable.delete(id);
}

export async function updateCheckTemplate(id: number, template: CheckTemplate): Promise<void> {
  await db.checkTemplatesTable.update(id, template);
}

