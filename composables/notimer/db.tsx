import Dexie, { EntityTable } from 'dexie';

export interface dbCheck {
  id: number;
  notimerSolveId: number; // Foreign key to reference NotimerSolve
  checked: boolean;
  text: string;
  location: 'pre' | 'post';
}

export interface NotimerSolve {
  id: number;
  scramble: string;
  puzzleType: string;
  solveDateTime: Date;
  solveResult: number; // in milliseconds
  solveModifier: string; // DNF, +2, or OK
  comment: string | null;
}

const db = new Dexie('ChecksDatabase') as Dexie & {
  solveTable: EntityTable<NotimerSolve, 'id'>;
  checkTable: EntityTable<dbCheck, 'id'>;
};

db.version(1).stores({
  solveTable: '++id, scramble, puzzleType, solveDateTime, solveResult, solveModifier, comment',
  checkTable: '++id, notimerSolveId, checked, text, location',
});

export { db };
