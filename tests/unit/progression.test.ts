import { describe, expect, it } from 'vitest';
import { suggestNext } from '../../src/utils/progression';

const cfg = { repMin: 8, repMax: 12, weightStep: 2.5 };
const s = (weight: number, reps: number, isWarmup = false) => ({ weight, reps, isWarmup, completed: true });

describe('progressive overload suggestion', () => {
  it('suggests +step when every working set reaches the top of the range', () => {
    expect(suggestNext([s(40, 10, true), s(60, 12), s(60, 12), s(60, 12)], cfg)).toEqual({ kind: 'increase', weight: 62.5, reps: 8, delta: 2.5 });
  });

  it('keeps the weight and aims for one more rep otherwise', () => {
    expect(suggestNext([s(60, 12), s(60, 11), s(60, 10)], cfg)).toEqual({ kind: 'reps', weight: 60, reps: 11 });
  });

  it('never targets below the range minimum or above the maximum', () => {
    expect(suggestNext([s(60, 5)], cfg)).toMatchObject({ reps: 8 });
    expect(suggestNext([s(60, 12), s(60, 11)], cfg)).toMatchObject({ reps: 12 });
  });

  it('judges only the sets at the top weight', () => {
    expect(suggestNext([s(70, 12), s(70, 12), s(60, 6)], cfg)).toMatchObject({ kind: 'increase', weight: 72.5 });
  });

  it('respects a custom step and rep range', () => {
    expect(suggestNext([s(20, 15), s(20, 15)], { repMin: 10, repMax: 15, weightStep: 1 })).toEqual({ kind: 'increase', weight: 21, reps: 10, delta: 1 });
  });

  it('suggests more reps for bodyweight exercises', () => {
    expect(suggestNext([s(0, 10), s(0, 9)], cfg)).toEqual({ kind: 'reps', weight: 0, reps: 10 });
  });

  it('has no suggestion without working sets', () => {
    expect(suggestNext([], cfg)).toEqual({ kind: 'none' });
    expect(suggestNext([s(40, 10, true)], cfg)).toEqual({ kind: 'none' });
  });
});
