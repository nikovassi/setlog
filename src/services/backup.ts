import { db, initDb, SCHEMA_VERSION } from '../db';
import { t } from '../i18n';
import type { Exercise, Routine, SettingRow, Workout, WorkoutExercise, WorkoutSet } from '../types';
import { estimate1RM, setVolume } from '../utils/calc';
import { toCSV } from '../utils/csv';
import { formatTime } from '../utils/format';

export const BACKUP_APP = 'setlog';

export interface BackupData {
  exercises: Exercise[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
  routines: Routine[];
  settings: SettingRow[];
}

export interface Backup {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
  /** Set by parseBackup: placeholder exercises, only added if the id is unknown on this device. */
  placeholderIds?: string[];
}

export async function exportBackup(): Promise<Backup> {
  const [exercises, workouts, workoutExercises, sets, routines, settings] = await Promise.all([
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.sets.toArray(),
    db.routines.toArray(),
    db.settings.toArray(),
  ]);
  return { app: BACKUP_APP, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: { exercises, workouts, workoutExercises, sets, routines, settings } };
}

export const CSV_HEADER = [
  'date', 'start_time', 'workout', 'duration_min', 'exercise', 'muscle_group', 'equipment', 'set_number', 'set_type',
  'weight_kg', 'reps', 'rpe', 'volume_kg', 'est_1rm_kg', 'set_notes', 'exercise_notes', 'workout_notes',
];

/** One row per completed set – easy to pivot in Excel / Google Sheets. */
export async function exportCSV(): Promise<string> {
  const { data } = await exportBackup();
  const workouts = new Map(data.workouts.filter((w) => w.status === 'completed').map((w) => [w.id, w]));
  const wes = new Map(data.workoutExercises.map((we) => [we.id, we]));
  const exercises = new Map(data.exercises.map((e) => [e.id, e]));
  const rows = data.sets
    .filter((s) => s.completed && workouts.has(s.workoutId))
    .map((s) => ({ s, w: workouts.get(s.workoutId)!, we: wes.get(s.workoutExerciseId), ex: exercises.get(s.exerciseId) }))
    .sort((a, b) => a.w.startTime.localeCompare(b.w.startTime) || (a.we?.order ?? 0) - (b.we?.order ?? 0) || a.s.setNumber - b.s.setNumber)
    .map(({ s, w, we, ex }) => [
      w.date, formatTime(w.startTime), w.name, w.duration != null ? Math.round(w.duration / 60) : '',
      ex?.name ?? 'Unknown exercise', ex?.muscleGroup ?? '', ex?.equipment ?? '', s.setNumber, s.isWarmup ? 'warmup' : 'working',
      s.weight ?? 0, s.reps ?? 0, s.rpe ?? '', s.isWarmup ? 0 : setVolume(s), s.isWarmup ? '' : estimate1RM(s.weight, s.reps),
      s.notes ?? '', we?.notes ?? '', w.notes,
    ]);
  return toCSV(CSV_HEADER, rows);
}

// ---------- import ----------

export interface ImportPreview {
  backup: Backup;
  counts: Record<keyof BackupData, number>;
  exportedAt: string;
  dateRange?: { from: string; to: string };
  warnings: string[];
}

export type ParseResult = { ok: true; preview: ImportPreview } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNumOrNull = (v: unknown) => v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v));
const isBool = (v: unknown) => typeof v === 'boolean';

type Check = (r: Record<string, unknown>) => boolean;
const CHECKS: Record<keyof BackupData, Check> = {
  exercises: (r) => isStr(r.id) && isStr(r.name) && r.name.trim() !== '' && isStr(r.muscleGroup) && isStr(r.equipment) && isBool(r.isCustom),
  workouts: (r) => isStr(r.id) && isStr(r.name) && isStr(r.date) && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && isStr(r.startTime) && !Number.isNaN(Date.parse(r.startTime)) && (r.status === 'active' || r.status === 'completed'),
  workoutExercises: (r) => isStr(r.id) && isStr(r.workoutId) && isStr(r.exerciseId) && typeof r.order === 'number',
  sets: (r) => isStr(r.id) && isStr(r.workoutExerciseId) && isStr(r.workoutId) && isStr(r.exerciseId) && typeof r.setNumber === 'number' && isNumOrNull(r.weight) && isNumOrNull(r.reps) && isNumOrNull(r.rpe) && isBool(r.completed),
  routines: (r) => isStr(r.id) && isStr(r.name) && Array.isArray(r.exercises) && r.exercises.every((e) => isObj(e) && isStr(e.exerciseId) && typeof e.sets === 'number'),
  settings: (r) => isStr(r.key),
};

const MAX_BYTES = 50 * 1024 * 1024;

/** Validates structure and referential integrity. Nothing is written. */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BYTES) return { ok: false, error: t('bk.tooLarge') };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: t('bk.notJson') };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP || !isObj(raw.data)) {
    return { ok: false, error: t('bk.notBackup') };
  }
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: t('bk.newer') };
  }
  const data = {} as BackupData;
  for (const key of Object.keys(CHECKS) as (keyof BackupData)[]) {
    const list = (raw.data as Record<string, unknown>)[key] ?? [];
    if (!Array.isArray(list)) return { ok: false, error: t('bk.notList', { key }) };
    const bad = list.findIndex((r) => !isObj(r) || !CHECKS[key](r));
    if (bad >= 0) return { ok: false, error: t('bk.badEntry', { n: bad + 1, key }) };
    (data as unknown as Record<string, unknown[]>)[key] = list;
  }

  // Normalise optional fields so older/hand-edited backups are safe to store.
  data.workouts = data.workouts.map((w) => ({ ...w, notes: w.notes ?? '', endTime: w.endTime ?? null, duration: w.duration ?? null }));
  data.workoutExercises = data.workoutExercises.map((we) => ({ ...we, notes: we.notes ?? '', supersetGroup: we.supersetGroup ?? null }));
  data.sets = data.sets.map((s) => ({ ...s, weight: s.weight ?? null, reps: s.reps ?? null, rpe: s.rpe ?? null, isWarmup: !!s.isWarmup, timestamp: s.timestamp ?? new Date(0).toISOString() }));
  data.routines = data.routines.map((r) => ({ ...r, description: r.description ?? '', createdAt: r.createdAt ?? new Date(0).toISOString(), updatedAt: r.updatedAt ?? new Date(0).toISOString() }));
  data.exercises = data.exercises.map((e) => ({ ...e, category: e.category ?? 'other', createdAt: e.createdAt ?? new Date(0).toISOString() }));

  const warnings: string[] = [];
  const workoutIds = new Set(data.workouts.map((w) => w.id));
  const weIds = new Set(data.workoutExercises.map((w) => w.id));
  const orphanWe = data.workoutExercises.filter((we) => !workoutIds.has(we.workoutId));
  const orphanSets = data.sets.filter((s) => !weIds.has(s.workoutExerciseId) || !workoutIds.has(s.workoutId));
  if (orphanWe.length || orphanSets.length) {
    warnings.push(t('bk.orphans', { n: orphanWe.length + orphanSets.length }));
    data.workoutExercises = data.workoutExercises.filter((we) => workoutIds.has(we.workoutId));
    const keptWe = new Set(data.workoutExercises.map((w) => w.id));
    data.sets = data.sets.filter((s) => keptWe.has(s.workoutExerciseId) && workoutIds.has(s.workoutId));
  }
  const exIds = new Set(data.exercises.map((e) => e.id));
  const missingEx = new Set([...data.workoutExercises.map((w) => w.exerciseId), ...data.routines.flatMap((r) => r.exercises.map((e) => e.exerciseId))].filter((id) => !exIds.has(id)));
  if (missingEx.size) {
    // Keep the history readable: missing exercises become placeholders the user can rename.
    warnings.push(t('bk.missingEx', { n: missingEx.size }));
    for (const id of missingEx) {
      data.exercises.push({ id, name: t('bk.placeholder', { id: id.slice(0, 6) }), category: 'other', muscleGroup: 'Other', equipment: 'Other', isCustom: true, createdAt: new Date().toISOString() });
    }
  }
  if (data.workouts.filter((w) => w.status === 'active').length > 0) warnings.push(t('bk.active'));
  data.workouts = data.workouts.map((w) => (w.status === 'active' ? { ...w, status: 'completed', endTime: w.endTime ?? w.startTime, duration: w.duration ?? 0 } : w));

  const dates = data.workouts.map((w) => w.date).sort();
  const counts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, (v as unknown[]).length])) as Record<keyof BackupData, number>;
  return {
    ok: true,
    preview: {
      backup: { app: BACKUP_APP, schemaVersion: raw.schemaVersion, exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '', data, placeholderIds: [...missingEx] },
      counts,
      exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '',
      dateRange: dates.length ? { from: dates[0], to: dates.at(-1)! } : undefined,
      warnings,
    },
  };
}

export type ImportMode = 'merge' | 'replace';

/**
 * Writes a validated backup in one transaction (all or nothing).
 * merge: adds new records and overwrites records with the same id.
 * replace: deletes all current data first – the UI must get explicit confirmation.
 */
export async function importBackup(backup: Backup, mode: ImportMode): Promise<void> {
  const { data } = backup;
  const tables = [db.exercises, db.workouts, db.workoutExercises, db.sets, db.routines, db.settings];
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') await Promise.all(tables.map((t) => t.clear()));
    const placeholders = new Set(backup.placeholderIds ?? []);
    const known = new Set((await db.exercises.bulkGet([...placeholders])).filter(Boolean).map((e) => e!.id));
    await db.exercises.bulkPut(data.exercises.filter((e) => !known.has(e.id)));
    await db.workouts.bulkPut(data.workouts);
    await db.workoutExercises.bulkPut(data.workoutExercises);
    await db.sets.bulkPut(data.sets);
    await db.routines.bulkPut(data.routines);
    await db.settings.bulkPut(data.settings);
  });
  await initDb(); // re-adds any missing seed exercises
}

export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
