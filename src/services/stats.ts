import { db } from '../db';
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '../types';
import { bestE1RM, isWorkingSet, topSet, totalVolume } from '../utils/calc';
import { todayLocal, weekStart } from '../utils/format';
import { countPRs, detectPRs, type PRKind } from '../utils/pr';

export interface Dataset {
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
  exercises: Exercise[];
}

/** Completed workouts only, everything indexed for in-memory aggregation (data volumes are small). */
export async function loadDataset(): Promise<Dataset> {
  const [workouts, workoutExercises, sets, exercises] = await Promise.all([
    db.workouts.where('status').equals('completed').toArray(),
    db.workoutExercises.toArray(),
    db.sets.toArray(),
    db.exercises.toArray(),
  ]);
  const done = new Set(workouts.map((w) => w.id));
  return {
    workouts: workouts.sort((a, b) => b.startTime.localeCompare(a.startTime)),
    workoutExercises: workoutExercises.filter((we) => done.has(we.workoutId)),
    sets: sets.filter((s) => done.has(s.workoutId) && s.completed),
    exercises,
  };
}

export interface WorkoutSummary {
  workout: Workout;
  exerciseCount: number;
  setCount: number;
  volume: number;
}

export function summarize(ds: Dataset, workout: Workout): WorkoutSummary {
  const sets = ds.sets.filter((s) => s.workoutId === workout.id);
  return {
    workout,
    exerciseCount: ds.workoutExercises.filter((we) => we.workoutId === workout.id).length,
    setCount: sets.filter(isWorkingSet).length,
    volume: totalVolume(sets),
  };
}

export interface PRRecord {
  set: WorkoutSet;
  exercise: Exercise | undefined;
  kinds: PRKind[];
}

/** Every set that beat an earlier record, newest first. */
export function prTimeline(ds: Dataset): PRRecord[] {
  const byEx = new Map<string, WorkoutSet[]>();
  const exMap = new Map(ds.exercises.map((e) => [e.id, e]));
  const out: PRRecord[] = [];
  for (const s of ds.sets.filter(isWorkingSet).sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    const hist = byEx.get(s.exerciseId) ?? [];
    const kinds = detectPRs(s, hist);
    if (kinds.length) out.push({ set: s, exercise: exMap.get(s.exerciseId), kinds });
    hist.push(s);
    byEx.set(s.exerciseId, hist);
  }
  return out.reverse();
}

export interface SeriesPoint {
  label: string;
  value: number;
}

/** Last `weeks` calendar weeks (Mon–Sun), oldest first. */
function weekKeys(weeks: number, today = todayLocal()): string[] {
  const keys: string[] = [];
  const [y, m, d] = weekStart(today).split('-').map(Number);
  for (let i = weeks - 1; i >= 0; i--) keys.push(todayLocal(new Date(y, m - 1, d - i * 7)));
  return keys;
}

const shortDate = (key: string) => `${Number(key.slice(8))}/${Number(key.slice(5, 7))}`;

export function weeklyVolume(ds: Dataset, weeks = 12, today?: string): SeriesPoint[] {
  const keys = weekKeys(weeks, today);
  const sums = new Map(keys.map((k) => [k, 0]));
  const dates = new Map(ds.workouts.map((w) => [w.id, w.date]));
  for (const s of ds.sets) {
    const k = weekStart(dates.get(s.workoutId) ?? '1970-01-01');
    if (sums.has(k)) sums.set(k, sums.get(k)! + totalVolume([s]));
  }
  return keys.map((k) => ({ label: shortDate(k), value: Math.round(sums.get(k)!) }));
}

export function weeklyFrequency(ds: Dataset, weeks = 12, today?: string): SeriesPoint[] {
  const keys = weekKeys(weeks, today);
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const w of ds.workouts) {
    const k = weekStart(w.date);
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((k) => ({ label: shortDate(k), value: counts.get(k)! }));
}

export interface ExercisePoint {
  date: string;
  label: string;
  weight: number;
  e1rm: number;
  volume: number;
  reps: number;
}

/** One point per session: top-set weight, best est. 1RM and working volume. */
export function exerciseSeries(ds: Pick<Dataset, 'workouts' | 'sets'>, exerciseId: string): ExercisePoint[] {
  const byWorkout = new Map<string, WorkoutSet[]>();
  for (const s of ds.sets) if (s.exerciseId === exerciseId) byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s]);
  return ds.workouts
    .filter((w) => byWorkout.has(w.id))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((w) => {
      const sets = byWorkout.get(w.id)!;
      const top = topSet(sets);
      return { date: w.date, label: shortDate(w.date), weight: top?.weight ?? 0, reps: top?.reps ?? 0, e1rm: bestE1RM(sets), volume: totalVolume(sets) };
    })
    .filter((p) => p.volume > 0 || p.reps > 0);
}

export interface ExerciseCount {
  exercise: Exercise;
  sessions: number;
  lastDate: string;
}

export function mostTrained(ds: Dataset, limit = 5): ExerciseCount[] {
  const exMap = new Map(ds.exercises.map((e) => [e.id, e]));
  const dates = new Map(ds.workouts.map((w) => [w.id, w.date]));
  const counts = new Map<string, ExerciseCount>();
  for (const we of ds.workoutExercises) {
    const exercise = exMap.get(we.exerciseId);
    if (!exercise) continue;
    const c = counts.get(we.exerciseId) ?? { exercise, sessions: 0, lastDate: '' };
    c.sessions++;
    const d = dates.get(we.workoutId) ?? '';
    if (d > c.lastDate) c.lastDate = d;
    counts.set(we.exerciseId, c);
  }
  return [...counts.values()].sort((a, b) => b.sessions - a.sessions || b.lastDate.localeCompare(a.lastDate)).slice(0, limit);
}

export interface Overview {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  totalVolume: number;
  weekVolume: number;
  prsThisMonth: number;
}

export function overview(ds: Dataset, today = todayLocal()): Overview {
  const wk = weekStart(today);
  const month = today.slice(0, 7);
  const weekIds = new Set(ds.workouts.filter((w) => w.date >= wk).map((w) => w.id));
  const monthStart = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1).toISOString();
  return {
    totalWorkouts: ds.workouts.length,
    thisWeek: weekIds.size,
    thisMonth: ds.workouts.filter((w) => w.date.startsWith(month)).length,
    totalVolume: totalVolume(ds.sets),
    weekVolume: totalVolume(ds.sets.filter((s) => weekIds.has(s.workoutId))),
    prsThisMonth: countPRs(ds.sets, monthStart),
  };
}

export interface ProgressHighlight {
  exercise: Exercise;
  from: number;
  to: number;
}

/** Top-set change of the most trained exercise over the last 8 weeks. */
export function progressHighlight(ds: Dataset, today = todayLocal()): ProgressHighlight | undefined {
  const [y, m, d] = today.split('-').map(Number);
  const since = todayLocal(new Date(y, m - 1, d - 56));
  const recent: Dataset = { ...ds, workouts: ds.workouts.filter((w) => w.date >= since) };
  const ids = new Set(recent.workouts.map((w) => w.id));
  recent.workoutExercises = ds.workoutExercises.filter((we) => ids.has(we.workoutId));
  recent.sets = ds.sets.filter((s) => ids.has(s.workoutId));
  for (const { exercise } of mostTrained(recent, 10)) {
    const series = exerciseSeries(recent, exercise.id).filter((p) => p.weight > 0);
    if (series.length >= 2) return { exercise, from: series[0].weight, to: series.at(-1)!.weight };
  }
  return undefined;
}
