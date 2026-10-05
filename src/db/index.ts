import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, Routine, SettingRow, Workout, WorkoutExercise, WorkoutSet } from '../types';
import { seedExercises } from './seed';

/**
 * Current schema version. Migration rules (see docs/ARCHITECTURE.md):
 *  - never edit or delete an existing `version(n)` block;
 *  - add `version(n + 1).stores({...}).upgrade(tx => ...)` for every change;
 *  - upgrades must transform data, never drop it.
 */
export const SCHEMA_VERSION = 1;

export class SetlogDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>;
  sets!: EntityTable<WorkoutSet, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor(name = 'setlog') {
    super(name);
    this.version(1).stores({
      exercises: 'id, name, muscleGroup, isCustom',
      workouts: 'id, date, status, startTime',
      workoutExercises: 'id, workoutId, exerciseId',
      sets: 'id, workoutExerciseId, workoutId, exerciseId, timestamp',
      routines: 'id, name, updatedAt',
      settings: 'key',
    });

    // Example for the next migration:
    // this.version(2).stores({ ... }).upgrade(tx => tx.table('sets').toCollection().modify(s => { s.newField ??= null; }));

    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(seedExercises());
    });
  }
}

export let db = new SetlogDB();

/** Opens the database and makes sure the seed library is present. */
export async function initDb(): Promise<void> {
  await db.open();
  // Adds seed exercises introduced in later app versions without touching user data.
  const seeds = seedExercises();
  const existing = new Set(await db.exercises.bulkGet(seeds.map((s) => s.id)).then((r) => r.filter(Boolean).map((e) => e!.id)));
  const missing = seeds.filter((s) => !existing.has(s.id));
  if (missing.length) await db.exercises.bulkAdd(missing);
}

/** Test helper: a fresh, isolated database. */
export async function resetDbForTests(): Promise<void> {
  db.close();
  await Dexie.delete(db.name);
  db = new SetlogDB(db.name);
  await initDb();
}
