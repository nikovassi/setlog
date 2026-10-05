import type { WorkoutSet } from '../types';
import { isWorkingSet, round2 } from './calc';

export interface ProgressionConfig {
  repMin: number;
  repMax: number;
  weightStep: number;
}

export type Suggestion =
  | { kind: 'increase'; weight: number; reps: number; delta: number }
  | { kind: 'reps'; weight: number; reps: number }
  | { kind: 'none' };

/**
 * Double progression: work in a rep range; once every working set at the top
 * weight reaches the top of the range, suggest adding one weight step and
 * restarting at the bottom of the range. Otherwise keep the weight and aim
 * for one more rep. This is a guideline only – the user picks the real weight.
 */
export function suggestNext(lastSession: Pick<WorkoutSet, 'weight' | 'reps' | 'completed' | 'isWarmup'>[], cfg: ProgressionConfig): Suggestion {
  const working = lastSession.filter(isWorkingSet);
  if (working.length === 0) return { kind: 'none' };

  const top = Math.max(...working.map((s) => s.weight ?? 0));
  const atTop = working.filter((s) => (s.weight ?? 0) === top);
  const minReps = Math.min(...atTop.map((s) => s.reps ?? 0));

  if (top > 0 && minReps >= cfg.repMax) {
    return { kind: 'increase', weight: round2(top + cfg.weightStep), reps: cfg.repMin, delta: cfg.weightStep };
  }
  // Bodyweight exercises, or not yet at the top of the range: one more rep.
  const target = top > 0 ? Math.min(cfg.repMax, Math.max(cfg.repMin, minReps + 1)) : minReps + 1;
  return { kind: 'reps', weight: top, reps: target };
}
