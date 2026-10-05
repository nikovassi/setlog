import { db } from '../db';
import type { Workout, WorkoutExercise, WorkoutSet } from '../types';
import { isWorkingSet } from '../utils/calc';
import { todayLocal } from '../utils/format';
import { t } from '../i18n';
import { newId } from '../utils/id';
import { detectPRs, type PRKind } from '../utils/pr';

const TABLES = () => [db.workouts, db.workoutExercises, db.sets] as const;

export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('active').first();
}

/** Latest completed session of an exercise (optionally excluding one workout). */
export async function lastPerformance(exerciseId: string, excludeWorkoutId?: string): Promise<{ workout: Workout; sets: WorkoutSet[] } | undefined> {
  const wes = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray();
  const workouts = (await db.workouts.bulkGet([...new Set(wes.map((w) => w.workoutId))]))
    .filter((w): w is Workout => !!w && w.status === 'completed' && w.id !== excludeWorkoutId)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
  for (const workout of workouts) {
    const weIds = wes.filter((we) => we.workoutId === workout.id).map((we) => we.id);
    const sets = (await db.sets.where('workoutExerciseId').anyOf(weIds).toArray())
      .filter((s) => s.completed)
      .sort((a, b) => a.setNumber - b.setNumber);
    if (sets.length) return { workout, sets };
  }
  return undefined;
}

function blankSet(we: WorkoutExercise, setNumber: number, from?: Pick<WorkoutSet, 'weight' | 'reps' | 'isWarmup'>): WorkoutSet {
  return {
    id: newId(),
    workoutExerciseId: we.id,
    workoutId: we.workoutId,
    exerciseId: we.exerciseId,
    setNumber,
    weight: from?.weight ?? null,
    reps: from?.reps ?? null,
    rpe: null,
    isWarmup: from?.isWarmup ?? false,
    completed: false,
    timestamp: new Date().toISOString(),
  };
}

/** Pre-filled sets for a newly added exercise: mirrors last session, or one empty set. */
async function prefilledSets(we: WorkoutExercise, count?: number): Promise<WorkoutSet[]> {
  const last = await lastPerformance(we.exerciseId, we.workoutId);
  const template = last?.sets ?? [];
  const n = Math.max(1, count ?? template.length);
  return Array.from({ length: n }, (_, i) => blankSet(we, i + 1, template[i] ?? template[template.length - 1]));
}

export async function startWorkout(opts: { routineId?: string; name?: string } = {}): Promise<Workout> {
  const existing = await getActiveWorkout();
  if (existing) return existing;
  const routine = opts.routineId ? await db.routines.get(opts.routineId) : undefined;
  const now = new Date();
  const workout: Workout = {
    id: newId(),
    name: opts.name ?? routine?.name ?? defaultWorkoutName(now),
    date: todayLocal(now),
    startTime: now.toISOString(),
    endTime: null,
    duration: null,
    notes: '',
    status: 'active',
    routineId: routine?.id ?? null,
  };
  await db.transaction('rw', [...TABLES(), db.exercises], async () => {
    await db.workouts.add(workout);
    if (!routine) return;
    for (const [order, re] of routine.exercises.entries()) {
      if (!(await db.exercises.get(re.exerciseId))) continue;
      const we: WorkoutExercise = { id: newId(), workoutId: workout.id, exerciseId: re.exerciseId, order, notes: '', supersetGroup: re.supersetGroup ?? null };
      await db.workoutExercises.add(we);
      await db.sets.bulkAdd(await prefilledSets(we, re.sets));
    }
  });
  return workout;
}

function defaultWorkoutName(d: Date): string {
  const h = d.getHours();
  return t(h < 12 ? 'workout.morning' : h < 18 ? 'workout.afternoon' : 'workout.evening');
}

export async function updateWorkout(id: string, patch: Partial<Pick<Workout, 'name' | 'notes' | 'date' | 'startTime' | 'endTime'>>): Promise<void> {
  const w = await db.workouts.get(id);
  if (!w) return;
  const next = { ...w, ...patch };
  if (next.endTime) next.duration = Math.max(0, Math.round((Date.parse(next.endTime) - Date.parse(next.startTime)) / 1000));
  await db.workouts.put(next);
}

export async function getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
  return (await db.workoutExercises.where('workoutId').equals(workoutId).toArray()).sort((a, b) => a.order - b.order);
}

export async function addExerciseToWorkout(workoutId: string, exerciseId: string): Promise<WorkoutExercise> {
  const list = await getWorkoutExercises(workoutId);
  const we: WorkoutExercise = { id: newId(), workoutId, exerciseId, order: (list.at(-1)?.order ?? -1) + 1, notes: '', supersetGroup: null };
  const sets = await prefilledSets(we);
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.workoutExercises.add(we);
    await db.sets.bulkAdd(sets);
  });
  return we;
}

export async function updateWorkoutExercise(id: string, patch: Partial<Pick<WorkoutExercise, 'notes' | 'supersetGroup'>>): Promise<void> {
  await db.workoutExercises.update(id, patch);
}

export async function getSets(workoutExerciseId: string): Promise<WorkoutSet[]> {
  return (await db.sets.where('workoutExerciseId').equals(workoutExerciseId).toArray()).sort((a, b) => a.setNumber - b.setNumber);
}

/** Adds a set, pre-filled from the previous set of this exercise, else from last session. */
export async function addSet(workoutExerciseId: string): Promise<WorkoutSet> {
  const we = await db.workoutExercises.get(workoutExerciseId);
  if (!we) throw new Error('Exercise not found in workout');
  const sets = await getSets(workoutExerciseId);
  let from: Pick<WorkoutSet, 'weight' | 'reps' | 'isWarmup'> | undefined = sets.at(-1) && { ...sets.at(-1)!, isWarmup: false };
  if (!from) from = (await lastPerformance(we.exerciseId, we.workoutId))?.sets.find((s) => !s.isWarmup);
  const set = blankSet(we, sets.length + 1, from);
  await db.sets.add(set);
  return set;
}

export type SetPatch = Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe' | 'isWarmup' | 'notes'>>;

export async function updateSet(id: string, patch: SetPatch): Promise<void> {
  await db.sets.update(id, patch);
}

/**
 * Toggles completion. When a set is completed it is time-stamped and compared
 * with all earlier sets of the same exercise; returns the PR kinds it beats.
 */
export async function completeSet(id: string, completed = true, values: SetPatch = {}): Promise<PRKind[]> {
  const set = await db.sets.get(id);
  if (!set) return [];
  const timestamp = completed ? new Date().toISOString() : set.timestamp;
  const updated: WorkoutSet = { ...set, ...values, completed, timestamp };
  // Values left empty count as zero weight (bodyweight) / no reps.
  if (completed && updated.weight == null) updated.weight = 0;
  await db.sets.put(updated);
  if (!completed || !isWorkingSet(updated)) return [];
  const history = (await db.sets.where('exerciseId').equals(set.exerciseId).toArray()).filter(
    (s) => s.id !== id && s.timestamp < timestamp,
  );
  return detectPRs(updated, history);
}

async function renumber(workoutExerciseId: string): Promise<void> {
  const sets = await getSets(workoutExerciseId);
  await db.sets.bulkPut(sets.map((s, i) => ({ ...s, setNumber: i + 1 })));
}

export async function deleteSet(id: string): Promise<WorkoutSet | undefined> {
  const set = await db.sets.get(id);
  if (!set) return undefined;
  await db.transaction('rw', db.sets, async () => {
    await db.sets.delete(id);
    await renumber(set.workoutExerciseId);
  });
  return set;
}

export async function restoreSet(set: WorkoutSet): Promise<void> {
  await db.transaction('rw', db.sets, async () => {
    const sets = await getSets(set.workoutExerciseId);
    const shifted = sets.map((s) => (s.setNumber >= set.setNumber ? { ...s, setNumber: s.setNumber + 1 } : s));
    await db.sets.bulkPut([...shifted, set]);
  });
}

export interface RemovedExercise {
  workoutExercise: WorkoutExercise;
  sets: WorkoutSet[];
}

export async function removeExerciseFromWorkout(workoutExerciseId: string): Promise<RemovedExercise | undefined> {
  const workoutExercise = await db.workoutExercises.get(workoutExerciseId);
  if (!workoutExercise) return undefined;
  const sets = await getSets(workoutExerciseId);
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.sets.bulkDelete(sets.map((s) => s.id));
    await db.workoutExercises.delete(workoutExerciseId);
  });
  return { workoutExercise, sets };
}

export async function restoreExercise(removed: RemovedExercise): Promise<void> {
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.workoutExercises.put(removed.workoutExercise);
    await db.sets.bulkPut(removed.sets);
  });
}

/** Moves an exercise one position up (-1) or down (+1). */
export async function moveExercise(workoutExerciseId: string, direction: -1 | 1): Promise<void> {
  const we = await db.workoutExercises.get(workoutExerciseId);
  if (!we) return;
  const list = await getWorkoutExercises(we.workoutId);
  const i = list.findIndex((x) => x.id === workoutExerciseId);
  const j = i + direction;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  // Supersets only stay linked where members are still adjacent.
  const links = list.slice(0, -1).map((x, k) => !!x.supersetGroup && x.supersetGroup === list[k + 1].supersetGroup);
  await db.workoutExercises.bulkPut(regroup(list, links).map((x, order) => ({ ...x, order })));
}

/**
 * Supersets are contiguous runs of exercises sharing a group id.
 * Toggles the link between an exercise and the next one, then re-derives groups.
 */
export async function toggleSupersetWithNext(workoutExerciseId: string): Promise<void> {
  const we = await db.workoutExercises.get(workoutExerciseId);
  if (!we) return;
  const list = await getWorkoutExercises(we.workoutId);
  const i = list.findIndex((x) => x.id === workoutExerciseId);
  if (i < 0 || i >= list.length - 1) return;
  const links = list.slice(0, -1).map((x, k) => !!x.supersetGroup && x.supersetGroup === list[k + 1].supersetGroup);
  links[i] = !links[i];
  await db.workoutExercises.bulkPut(regroup(list, links));
}

export function regroup<T extends { supersetGroup?: string | null }>(list: T[], links: boolean[]): T[] {
  let group: string | null = null;
  return list.map((x, k) => {
    const linkedPrev = k > 0 && links[k - 1];
    const linkedNext = k < links.length && links[k];
    if (!linkedPrev) group = linkedNext ? newId() : null;
    return { ...x, supersetGroup: group };
  });
}

/** "A1", "A2", "B1"… for exercises in supersets, null otherwise. */
export function supersetLabels(list: { supersetGroup?: string | null }[]): (string | null)[] {
  const letters = new Map<string, string>();
  const counters = new Map<string, number>();
  return list.map((x) => {
    const g = x.supersetGroup;
    if (!g || list.filter((y) => y.supersetGroup === g).length < 2) return null;
    if (!letters.has(g)) letters.set(g, String.fromCharCode(65 + letters.size));
    const n = (counters.get(g) ?? 0) + 1;
    counters.set(g, n);
    return letters.get(g)! + n;
  });
}

export interface FinishResult {
  workout: Workout;
  discardedSets: number;
}

/**
 * Ends the active workout. Incomplete sets with values are kept as completed when
 * `keepFilled` is true; empty or (otherwise) incomplete sets are discarded, as are
 * exercises left with no sets.
 */
export async function finishWorkout(workoutId: string, keepFilled = false): Promise<FinishResult> {
  let discardedSets = 0;
  let workout!: Workout;
  await db.transaction('rw', TABLES(), async () => {
    const w = await db.workouts.get(workoutId);
    if (!w) throw new Error('Workout not found');
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
    const now = new Date().toISOString();
    for (const s of sets) {
      if (s.completed) continue;
      if (keepFilled && (s.reps ?? 0) > 0) {
        await db.sets.put({ ...s, completed: true, weight: s.weight ?? 0, timestamp: now });
      } else {
        await db.sets.delete(s.id);
        discardedSets++;
      }
    }
    for (const we of await db.workoutExercises.where('workoutId').equals(workoutId).toArray()) {
      if ((await db.sets.where('workoutExerciseId').equals(we.id).count()) === 0) await db.workoutExercises.delete(we.id);
      else await renumber(we.id);
    }
    const endTime = now;
    workout = { ...w, status: 'completed', endTime, duration: Math.round((Date.parse(endTime) - Date.parse(w.startTime)) / 1000) };
    await db.workouts.put(workout);
  });
  return { workout, discardedSets };
}

export interface WorkoutSnapshot {
  workout: Workout;
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
}

/** Deletes a workout with all its exercises and sets; returns a snapshot for undo. */
export async function deleteWorkout(workoutId: string): Promise<WorkoutSnapshot | undefined> {
  let snap: WorkoutSnapshot | undefined;
  await db.transaction('rw', TABLES(), async () => {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return;
    const workoutExercises = await db.workoutExercises.where('workoutId').equals(workoutId).toArray();
    const sets = await db.sets.where('workoutId').equals(workoutId).toArray();
    snap = { workout, workoutExercises, sets };
    await db.sets.bulkDelete(sets.map((s) => s.id));
    await db.workoutExercises.bulkDelete(workoutExercises.map((w) => w.id));
    await db.workouts.delete(workoutId);
  });
  return snap;
}

export async function restoreWorkout(snap: WorkoutSnapshot): Promise<void> {
  await db.transaction('rw', TABLES(), async () => {
    await db.workouts.put(snap.workout);
    await db.workoutExercises.bulkPut(snap.workoutExercises);
    await db.sets.bulkPut(snap.sets);
  });
}

export interface ExerciseSession {
  workout: Workout;
  workoutExercise: WorkoutExercise;
  sets: WorkoutSet[];
}

/** All completed sessions of an exercise, newest first. */
export async function exerciseHistory(exerciseId: string): Promise<ExerciseSession[]> {
  const wes = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray();
  const workouts = new Map((await db.workouts.bulkGet(wes.map((w) => w.workoutId))).filter(Boolean).map((w) => [w!.id, w!]));
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  return wes
    .map((we) => ({
      workout: workouts.get(we.workoutId)!,
      workoutExercise: we,
      sets: sets.filter((s) => s.workoutExerciseId === we.id && s.completed).sort((a, b) => a.setNumber - b.setNumber),
    }))
    .filter((x) => x.workout && x.workout.status === 'completed' && x.sets.length > 0)
    .sort((a, b) => b.workout.startTime.localeCompare(a.workout.startTime));
}
