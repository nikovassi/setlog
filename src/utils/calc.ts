import type { WorkoutSet } from '../types';

type SetLike = Pick<WorkoutSet, 'weight' | 'reps' | 'completed' | 'isWarmup'>;

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** A set that counts for volume, PRs and progression. */
export function isWorkingSet(s: SetLike): boolean {
  return s.completed && !s.isWarmup && (s.reps ?? 0) > 0;
}

/** weight × reps (missing values count as 0). */
export function setVolume(s: Pick<WorkoutSet, 'weight' | 'reps'>): number {
  return (s.weight ?? 0) * (s.reps ?? 0);
}

/** Sum of weight × reps over completed working sets (warm-ups excluded). */
export function totalVolume(sets: SetLike[]): number {
  return round1(sets.filter(isWorkingSet).reduce((sum, s) => sum + setVolume(s), 0));
}

export function warmupVolume(sets: SetLike[]): number {
  return round1(sets.filter((s) => s.completed && s.isWarmup).reduce((sum, s) => sum + setVolume(s), 0));
}

/** Estimated one-rep max (Epley): weight × (1 + reps / 30). An estimate, not a measured value. */
export function estimate1RM(weight: number | null, reps: number | null): number {
  const w = weight ?? 0;
  const r = reps ?? 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return round1(w * (1 + r / 30));
}

export function bestE1RM(sets: SetLike[]): number {
  return sets.filter(isWorkingSet).reduce((m, s) => Math.max(m, estimate1RM(s.weight, s.reps)), 0);
}

/** Heaviest working set (ties broken by reps). */
export function topSet<T extends SetLike>(sets: T[]): T | undefined {
  return sets
    .filter(isWorkingSet)
    .reduce<T | undefined>((best, s) => {
      if (!best) return s;
      const w = s.weight ?? 0, bw = best.weight ?? 0;
      return w > bw || (w === bw && (s.reps ?? 0) > (best.reps ?? 0)) ? s : best;
    }, undefined);
}
