import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDbForTests } from '../../src/db';
import { seedId } from '../../src/db/seed';
import { createExercise, deleteExercise } from '../../src/services/exercises';
import { saveRoutine } from '../../src/services/routines';
import * as W from '../../src/services/workouts';

const BENCH = seedId('Bench Press');
const ROW = seedId('Cable Row');
const SQUAT = seedId('Squat');

beforeEach(async () => {
  await resetDbForTests();
});

/** Logs a completed workout with the given sets for one exercise. */
async function logWorkout(exerciseId: string, sets: [number, number][]) {
  const w = await W.startWorkout();
  const we = await W.addExerciseToWorkout(w.id, exerciseId);
  const existing = await W.getSets(we.id);
  for (let i = 0; i < sets.length; i++) {
    const s = existing[i] ?? (await W.addSet(we.id));
    await W.completeSet(s.id, true, { weight: sets[i][0], reps: sets[i][1] });
  }
  return (await W.finishWorkout(w.id)).workout;
}

describe('database', () => {
  it('seeds the exercise library once', async () => {
    const count = await db.exercises.count();
    expect(count).toBeGreaterThanOrEqual(18);
    expect(await db.exercises.get(BENCH)).toMatchObject({ name: 'Bench Press', isCustom: false });
    await resetDbForTests();
    expect(await db.exercises.count()).toBe(count);
  });

  it('supports exercise CRUD and protects history', async () => {
    const ex = await createExercise({ name: ' Cable Lateral Raise ', muscleGroup: 'Shoulders', equipment: 'Cable' });
    expect(ex).toMatchObject({ name: 'Cable Lateral Raise', isCustom: true, category: 'cable' });
    await expect(createExercise({ name: 'cable lateral raise', muscleGroup: 'Shoulders', equipment: 'Cable' })).rejects.toThrow(/already exists/);
    await expect(createExercise({ name: '  ', muscleGroup: 'Shoulders', equipment: 'Cable' })).rejects.toThrow();

    await logWorkout(ex.id, [[10, 12]]);
    expect(await deleteExercise(ex.id)).toBe('archived');
    expect(await db.exercises.get(ex.id)).toMatchObject({ archived: true });

    const unused = await createExercise({ name: 'Temp', muscleGroup: 'Other', equipment: 'Other' });
    expect(await deleteExercise(unused.id)).toBe('deleted');
    expect(await db.exercises.get(unused.id)).toBeUndefined();
  });
});

describe('workout flow', () => {
  it('creates a single active workout', async () => {
    const w = await W.startWorkout();
    expect(w.status).toBe('active');
    expect(w.endTime).toBeNull();
    expect((await W.startWorkout()).id).toBe(w.id);
    expect((await W.getActiveWorkout())?.id).toBe(w.id);
  });

  it('adds an exercise with one empty set when there is no history', async () => {
    const w = await W.startWorkout();
    const we = await W.addExerciseToWorkout(w.id, BENCH);
    const sets = await W.getSets(we.id);
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ setNumber: 1, weight: null, reps: null, completed: false, workoutId: w.id, exerciseId: BENCH });
  });

  it('adds, edits, completes and deletes sets', async () => {
    const w = await W.startWorkout();
    const we = await W.addExerciseToWorkout(w.id, BENCH);
    const [first] = await W.getSets(we.id);
    await W.updateSet(first.id, { weight: 60, reps: 8 });
    const second = await W.addSet(we.id);
    expect(second).toMatchObject({ setNumber: 2, weight: 60, reps: 8, completed: false }); // copied from previous set

    await W.updateSet(second.id, { weight: 62.5, reps: 6, rpe: 8.5, notes: 'Felt heavy' });
    await W.completeSet(second.id);
    expect(await db.sets.get(second.id)).toMatchObject({ weight: 62.5, reps: 6, rpe: 8.5, completed: true, notes: 'Felt heavy' });

    const third = await W.addSet(we.id);
    const removed = await W.deleteSet(first.id);
    let sets = await W.getSets(we.id);
    expect(sets.map((s) => [s.id, s.setNumber])).toEqual([
      [second.id, 1],
      [third.id, 2],
    ]);

    await W.restoreSet(removed!);
    sets = await W.getSets(we.id);
    expect(sets.map((s) => s.id)).toEqual([first.id, second.id, third.id]);
    expect(sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
  });

  it('removes and restores an exercise with its sets (undo)', async () => {
    const w = await W.startWorkout();
    const we = await W.addExerciseToWorkout(w.id, BENCH);
    await W.addSet(we.id);
    const removed = await W.removeExerciseFromWorkout(we.id);
    expect(await W.getWorkoutExercises(w.id)).toHaveLength(0);
    expect(await db.sets.where('workoutExerciseId').equals(we.id).count()).toBe(0);
    await W.restoreExercise(removed!);
    expect(await W.getSets(we.id)).toHaveLength(2);
  });

  it('reorders exercises and links supersets', async () => {
    const w = await W.startWorkout();
    const a = await W.addExerciseToWorkout(w.id, BENCH);
    const b = await W.addExerciseToWorkout(w.id, ROW);
    const c = await W.addExerciseToWorkout(w.id, SQUAT);

    await W.toggleSupersetWithNext(a.id);
    let list = await W.getWorkoutExercises(w.id);
    expect(W.supersetLabels(list)).toEqual(['A1', 'A2', null]);

    await W.moveExercise(c.id, -1); // squat between bench and row → superset broken
    list = await W.getWorkoutExercises(w.id);
    expect(list.map((x) => x.exerciseId)).toEqual([BENCH, SQUAT, ROW]);
    expect(W.supersetLabels(list)).toEqual([null, null, null]);

    await W.toggleSupersetWithNext(list[1].id);
    list = await W.getWorkoutExercises(w.id);
    expect(W.supersetLabels(list)).toEqual([null, 'A1', 'A2']);
    await W.toggleSupersetWithNext(list[1].id);
    expect(W.supersetLabels(await W.getWorkoutExercises(w.id))).toEqual([null, null, null]);
    expect(b).toBeDefined();
  });

  it('finishes a workout and discards empty sets and exercises', async () => {
    const w = await W.startWorkout();
    const we = await W.addExerciseToWorkout(w.id, BENCH);
    const [s1] = await W.getSets(we.id);
    await W.completeSet(s1.id, true, { weight: 60, reps: 8 });
    await W.addSet(we.id); // pre-filled, not completed
    await W.addExerciseToWorkout(w.id, SQUAT); // empty

    const { workout, discardedSets } = await W.finishWorkout(w.id);
    expect(workout.status).toBe('completed');
    expect(workout.endTime).not.toBeNull();
    expect(workout.duration).toBeGreaterThanOrEqual(0);
    expect(discardedSets).toBe(2);
    expect(await W.getWorkoutExercises(w.id)).toHaveLength(1);
    expect(await W.getActiveWorkout()).toBeUndefined();
  });

  it('can keep filled but unchecked sets when finishing', async () => {
    const w = await W.startWorkout();
    const we = await W.addExerciseToWorkout(w.id, BENCH);
    const [s1] = await W.getSets(we.id);
    await W.updateSet(s1.id, { weight: 60, reps: 8 });
    await W.finishWorkout(w.id, true);
    expect(await db.sets.get(s1.id)).toMatchObject({ completed: true });
  });

  it('shows the last performance and pre-fills the next session from it', async () => {
    const first = await logWorkout(BENCH, [
      [60, 8],
      [60, 8],
      [60, 7],
    ]);
    const w = await W.startWorkout();
    const last = await W.lastPerformance(BENCH, w.id);
    expect(last?.workout.id).toBe(first.id);
    expect(last?.sets.map((s) => [s.weight, s.reps])).toEqual([
      [60, 8],
      [60, 8],
      [60, 7],
    ]);
    const we = await W.addExerciseToWorkout(w.id, BENCH);
    expect((await W.getSets(we.id)).map((s) => [s.weight, s.reps, s.completed])).toEqual([
      [60, 8, false],
      [60, 8, false],
      [60, 7, false],
    ]);
  });

  it('reports PRs when a set beats earlier sessions', async () => {
    await logWorkout(BENCH, [[60, 8]]);
    const w = await W.startWorkout();
    const we = await W.addExerciseToWorkout(w.id, BENCH);
    const [s] = await W.getSets(we.id);
    expect(await W.completeSet(s.id, true, { weight: 60, reps: 8 })).toEqual([]);
    const next = await W.addSet(we.id);
    expect(await W.completeSet(next.id, true, { weight: 65, reps: 8 })).toContain('weight');
  });

  it('starts a workout from a routine with exercises, sets and supersets', async () => {
    await logWorkout(BENCH, [[70, 10]]);
    const r = await saveRoutine({
      name: 'Push',
      exercises: [
        { exerciseId: BENCH, sets: 3, supersetGroup: 'g' },
        { exerciseId: ROW, sets: 2, supersetGroup: 'g' },
      ],
    });
    const w = await W.startWorkout({ routineId: r.id });
    expect(w.name).toBe('Push');
    const list = await W.getWorkoutExercises(w.id);
    expect(list.map((x) => x.exerciseId)).toEqual([BENCH, ROW]);
    expect(W.supersetLabels(list)).toEqual(['A1', 'A2']);
    const benchSets = await W.getSets(list[0].id);
    expect(benchSets.map((s) => [s.weight, s.reps])).toEqual([
      [70, 10],
      [70, 10],
      [70, 10],
    ]);
    expect(await W.getSets(list[1].id)).toHaveLength(2);
  });

  it('deletes and restores a finished workout', async () => {
    const w = await logWorkout(BENCH, [[60, 8]]);
    const snap = await W.deleteWorkout(w.id);
    expect(await db.workouts.get(w.id)).toBeUndefined();
    expect(await db.sets.where('workoutId').equals(w.id).count()).toBe(0);
    await W.restoreWorkout(snap!);
    expect(await db.sets.where('workoutId').equals(w.id).count()).toBe(1);
  });

  it('lists exercise history newest first', async () => {
    await logWorkout(BENCH, [[60, 8]]);
    await logWorkout(BENCH, [[62.5, 8]]);
    const hist = await W.exerciseHistory(BENCH);
    expect(hist.map((h) => h.sets[0].weight)).toEqual([62.5, 60]);
  });
});
