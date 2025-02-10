import Dexie, { EntityTable } from 'dexie';
import type { Check } from '../../components/notimer/NoTimeSolveBox';

export interface dbCheck {
  id: number;
  notimerSolveId: number; // Foreign key to reference NotimerSolve
  checkTemplateId: number; // Foreign key to reference CheckTemplate
  checked: boolean;
  location: 'pre' | 'post';
}

export interface newNotimerSolve {
  scramble: string;
  puzzleType: string;
  solveDateTime: Date;
  solveResult: number; // in milliseconds
  solveModifier: "DNF" | "+2" | "OK";
  comment: string | null;
}

export interface NotimerSolve extends newNotimerSolve {
  id: number;
}


export interface CheckTemplate {
  id: number;
  text: string;
}

// Extend the Dexie database with the new table.
const db = new Dexie('ChecksDatabase') as Dexie & {
  solveTable: EntityTable<NotimerSolve, 'id'>; // stores all solves
  checkTable: EntityTable<dbCheck, 'id'>; // stores all instances of checks for all solves
  checkTemplatesTable: EntityTable<CheckTemplate, 'id'>; // stores unique check texts
};

db.version(3).stores({
  solveTable: '++id, scramble, puzzleType, solveDateTime, solveResult, solveModifier, comment',

  checkTable: '++id, notimerSolveId, checkTextId, checked, location',

  checkTemplatesTable: '++id, text' 
    // Text field does not have to be unqiue. 
    // This implies that the same text can be used in multiple checks. 
    // But shape icons will be used to distinguish.
});

export { db };