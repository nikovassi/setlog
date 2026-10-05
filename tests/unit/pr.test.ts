import { describe, expect, it } from 'vitest';
import type { WorkoutSet } from '../../src/types';
import { countPRs, detectPRs, exerciseRecords } from '../../src/utils/pr';

let n = 0;
function set(weight: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet {
  n++;
  return {
    id: `s${n}`,
    workoutExerciseId: 'we',
    workoutId: 'w',
    exerciseId: 'bench',
    setNumber: 1,
    weight,
    reps,
    rpe: null,
    isWarmup: false,
    completed: true,
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString(),
    ...extra,
  };
}

describe('detectPRs', () => {
  const history = [set(60, 8), set(60, 8), set(60, 7)];

  it('reports nothing on the very first session', () => {
    expect(detectPRs(set(60, 8), [])).toEqual([]);
  });

  it('detects heaviest weight, e1RM and volume', () => {
    expect(detectPRs(set(65, 8), history).sort()).toEqual(['e1rm', 'volume', 'weight']);
  });

  it('detects most reps at a given weight', () => {
    expect(detectPRs(set(60, 9), history)).toContain('reps');
    expect(detectPRs(set(60, 9), history)).not.toContain('weight');
  });

  it('does not report reps PR at a lighter weight than anything done before when reps are lower', () => {
    expect(detectPRs(set(50, 8), history)).toEqual([]);
  });

  it('ignores warm-ups and incomplete sets', () => {
    expect(detectPRs(set(100, 5, { isWarmup: true }), history)).toEqual([]);
    expect(detectPRs(set(100, 5, { completed: false }), history)).toEqual([]);
    expect(detectPRs(set(55, 8), [...history, set(200, 1, { isWarmup: true })])).toEqual([]);
  });

  it('a repeat of the best set is not a PR', () => {
    expect(detectPRs(set(60, 8), history)).toEqual([]);
  });
});

describe('records', () => {
  it('finds all-time bests', () => {
    const sets = [set(60, 12), set(80, 3), set(70, 8)];
    const r = exerciseRecords(sets);
    expect(r.maxWeight?.weight).toBe(80);
    expect(r.maxReps?.reps).toBe(12);
    expect(r.bestVolume?.weight).toBe(60); // 720 vs 560 vs 240
    expect(r.bestE1RM?.weight).toBe(70); // 88.7 vs 84 vs 88
  });

  it('counts PR-setting sets chronologically', () => {
    const sets = [set(60, 8), set(62.5, 8), set(62.5, 8), set(65, 6)];
    expect(countPRs(sets)).toBe(2);
    expect(countPRs(sets, sets[3].timestamp)).toBe(1);
  });
});
