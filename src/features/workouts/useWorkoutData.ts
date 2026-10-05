import { db } from '../../db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { getSets, getWorkoutExercises, lastPerformance, supersetLabels } from '../../services/workouts';
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '../../types';

export interface WorkoutItem {
  we: WorkoutExercise;
  exercise: Exercise | undefined;
  sets: WorkoutSet[];
  label: string | null;
  /** Last completed session of this exercise before this workout. */
  last?: { workout: Workout; sets: WorkoutSet[] };
  /** True when this is the last exercise of its superset (rest timer starts here). */
  endsSuperset: boolean;
}

export interface WorkoutData {
  workout: Workout;
  items: WorkoutItem[];
}

export function useWorkoutData(workoutId: string | undefined, withLast = true): WorkoutData | null | undefined {
  return useLiveQuery(async () => {
    if (!workoutId) return null;
    const workout = await db.workouts.get(workoutId);
    if (!workout) return null;
    const wes = await getWorkoutExercises(workoutId);
    const labels = supersetLabels(wes);
    const items = await Promise.all(
      wes.map(async (we, i): Promise<WorkoutItem> => {
        const [exercise, sets, last] = await Promise.all([
          db.exercises.get(we.exerciseId),
          getSets(we.id),
          withLast ? lastPerformance(we.exerciseId, workoutId) : undefined,
        ]);
        const next = wes[i + 1];
        const endsSuperset = !labels[i] || !next || next.supersetGroup !== we.supersetGroup;
        return { we, exercise, sets, label: labels[i], last, endsSuperset };
      }),
    );
    return { workout, items };
  }, [workoutId, withLast]);
}
