import { t } from '../i18n';
import type { WorkoutSet } from '../types';
import { estimate1RM, isWorkingSet, setVolume } from './calc';

export type PRKind = 'weight' | 'reps' | 'e1rm' | 'volume';

export function prLabel(kind: PRKind): string {
  return t(`pr.${kind}`);
}

type SetLike = Pick<WorkoutSet, 'weight' | 'reps' | 'completed' | 'isWarmup'>;

/**
 * Which records does `candidate` beat, compared with `history`
 * (earlier sets of the same exercise)? With no history there is nothing to beat,
 * so the first session never produces PR noise.
 */
export function detectPRs(candidate: SetLike, history: SetLike[]): PRKind[] {
  if (!isWorkingSet(candidate)) return [];
  const prior = history.filter(isWorkingSet);
  if (prior.length === 0) return [];

  const w = candidate.weight ?? 0;
  const r = candidate.reps ?? 0;
  const kinds: PRKind[] = [];

  const maxWeight = Math.max(...prior.map((s) => s.weight ?? 0));
  if (w > 0 && w > maxWeight) kinds.push('weight');

  const atLeastAsHeavy = prior.filter((s) => (s.weight ?? 0) >= w);
  if (atLeastAsHeavy.length > 0 && r > Math.max(...atLeastAsHeavy.map((s) => s.reps ?? 0))) kinds.push('reps');

  const e1rm = estimate1RM(w, r);
  if (e1rm > 0 && e1rm > Math.max(...prior.map((s) => estimate1RM(s.weight, s.reps)))) kinds.push('e1rm');

  const vol = setVolume(candidate);
  if (vol > 0 && vol > Math.max(...prior.map(setVolume))) kinds.push('volume');

  return kinds;
}

export interface ExerciseRecords {
  maxWeight?: WorkoutSet;
  bestE1RM?: WorkoutSet;
  bestVolume?: WorkoutSet;
  maxReps?: WorkoutSet;
}

/** All-time bests for one exercise. */
export function exerciseRecords(sets: WorkoutSet[]): ExerciseRecords {
  // Oldest first, so the first time a record was reached is the one shown.
  const working = sets.filter(isWorkingSet).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const best = (score: (s: WorkoutSet) => number) =>
    working.reduce<WorkoutSet | undefined>((b, s) => (!b || score(s) > score(b) ? s : b), undefined);
  return {
    maxWeight: best((s) => (s.weight ?? 0) * 1000 + (s.reps ?? 0)),
    bestE1RM: best((s) => estimate1RM(s.weight, s.reps)),
    bestVolume: best(setVolume),
    maxReps: best((s) => (s.reps ?? 0) * 1000 + (s.weight ?? 0)),
  };
}

/**
 * Counts PR-setting sets in chronological order. Each set is compared with all
 * earlier sets of the same exercise. `sinceIso` limits which sets are counted
 * (earlier sets still act as history).
 */
export function countPRs(allSets: WorkoutSet[], sinceIso?: string): number {
  const sorted = allSets.filter(isWorkingSet).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const byExercise = new Map<string, WorkoutSet[]>();
  let count = 0;
  for (const s of sorted) {
    const history = byExercise.get(s.exerciseId) ?? [];
    if ((!sinceIso || s.timestamp >= sinceIso) && detectPRs(s, history).length > 0) count++;
    history.push(s);
    byExercise.set(s.exerciseId, history);
  }
  return count;
}
