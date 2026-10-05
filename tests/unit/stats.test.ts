import { describe, expect, it } from 'vitest';
import { exerciseSeries, overview, weeklyFrequency, weeklyVolume, type Dataset } from '../../src/services/stats';
import type { Workout, WorkoutSet } from '../../src/types';

function w(id: string, date: string): Workout {
  return { id, name: id, date, startTime: `${date}T10:00:00.000Z`, endTime: `${date}T11:00:00.000Z`, duration: 3600, notes: '', status: 'completed' };
}
function s(workoutId: string, weight: number, reps: number, ts: string, isWarmup = false): WorkoutSet {
  return { id: `${workoutId}-${weight}-${reps}-${ts}`, workoutExerciseId: `${workoutId}-we`, workoutId, exerciseId: 'bench', setNumber: 1, weight, reps, rpe: null, isWarmup, completed: true, timestamp: ts };
}

const ds: Dataset = {
  workouts: [w('b', '2026-10-05'), w('a', '2026-09-28')],
  workoutExercises: [
    { id: 'a-we', workoutId: 'a', exerciseId: 'bench', order: 0, notes: '' },
    { id: 'b-we', workoutId: 'b', exerciseId: 'bench', order: 0, notes: '' },
  ],
  sets: [s('a', 60, 8, '2026-09-28T10:01:00Z'), s('a', 40, 10, '2026-09-28T10:00:00Z', true), s('b', 65, 8, '2026-10-05T10:01:00Z')],
  exercises: [{ id: 'bench', name: 'Bench Press', category: 'barbell', muscleGroup: 'Chest', equipment: 'Barbell', isCustom: false, createdAt: '' }],
};

describe('stats', () => {
  it('builds the overview', () => {
    expect(overview(ds, '2026-10-07')).toEqual({ totalWorkouts: 2, thisWeek: 1, thisMonth: 1, totalVolume: 1000, weekVolume: 520, prsThisMonth: 1 });
  });

  it('aggregates weekly volume and frequency (Mon–Sun)', () => {
    const vol = weeklyVolume(ds, 3, '2026-10-07');
    expect(vol.map((p) => p.value)).toEqual([0, 480, 520]);
    expect(vol.at(-1)?.label).toBe('5/10');
    expect(weeklyFrequency(ds, 2, '2026-10-07').map((p) => p.value)).toEqual([1, 1]);
  });

  it('builds per-session exercise series oldest first', () => {
    expect(exerciseSeries(ds, 'bench').map((p) => [p.date, p.weight, p.e1rm, p.volume])).toEqual([
      ['2026-09-28', 60, 76, 480],
      ['2026-10-05', 65, 82.3, 520],
    ]);
  });
});
