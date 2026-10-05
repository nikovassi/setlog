import { describe, expect, it } from 'vitest';
import { bestE1RM, estimate1RM, setVolume, topSet, totalVolume, warmupVolume } from '../../src/utils/calc';

const s = (weight: number | null, reps: number | null, extra: { isWarmup?: boolean; completed?: boolean } = {}) => ({
  weight,
  reps,
  isWarmup: extra.isWarmup ?? false,
  completed: extra.completed ?? true,
});

describe('volume', () => {
  it('is weight × reps per set', () => {
    expect(setVolume({ weight: 60, reps: 8 })).toBe(480);
    expect(setVolume({ weight: null, reps: 10 })).toBe(0);
  });

  it('sums completed working sets only, excluding warm-ups', () => {
    const sets = [s(40, 10, { isWarmup: true }), s(60, 8), s(60, 8), s(60, 7), s(60, 8, { completed: false })];
    expect(totalVolume(sets)).toBe(60 * 8 + 60 * 8 + 60 * 7);
    expect(warmupVolume(sets)).toBe(400);
  });

  it('handles decimals without float noise', () => {
    expect(totalVolume([s(62.5, 3), s(0.1, 3)])).toBe(187.8);
  });
});

describe('estimated 1RM (Epley)', () => {
  it('uses weight × (1 + reps / 30)', () => {
    expect(estimate1RM(100, 10)).toBe(133.3);
    expect(estimate1RM(60, 8)).toBe(76);
  });
  it('returns the weight itself for a single', () => {
    expect(estimate1RM(140, 1)).toBe(140);
  });
  it('is 0 for missing or invalid input', () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(null, null)).toBe(0);
  });
  it('picks the best working set', () => {
    expect(bestE1RM([s(100, 5), s(90, 10), s(120, 3, { isWarmup: true })])).toBe(120);
  });
});

describe('topSet', () => {
  it('is the heaviest working set, ties broken by reps', () => {
    expect(topSet([s(60, 8), s(65, 5), s(65, 6), s(80, 1, { isWarmup: true })])).toMatchObject({ weight: 65, reps: 6 });
  });
});
