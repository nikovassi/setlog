import { db } from '../db';
import type { Routine, RoutineExercise, Workout } from '../types';
import { newId } from '../utils/id';
import { ValidationError } from './exercises';
import { getWorkoutExercises } from './workouts';

export interface RoutineInput {
  name: string;
  description?: string;
  exercises: RoutineExercise[];
}

export async function saveRoutine(input: RoutineInput, id?: string): Promise<Routine> {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Please enter a name.');
  const now = new Date().toISOString();
  const prev = id ? await db.routines.get(id) : undefined;
  const routine: Routine = {
    id: prev?.id ?? newId(),
    name,
    description: input.description?.trim() ?? '',
    exercises: input.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: Math.max(1, Math.min(20, Math.round(e.sets))), supersetGroup: e.supersetGroup ?? null })),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
  await db.routines.put(routine);
  return routine;
}

export async function deleteRoutine(id: string): Promise<Routine | undefined> {
  const r = await db.routines.get(id);
  await db.routines.delete(id);
  return r;
}

/** Creates a routine from a finished workout ("save as template"). */
export async function routineFromWorkout(workout: Workout): Promise<Routine> {
  const wes = await getWorkoutExercises(workout.id);
  const exercises: RoutineExercise[] = [];
  for (const we of wes) {
    const sets = await db.sets.where('workoutExerciseId').equals(we.id).filter((s) => !s.isWarmup).count();
    exercises.push({ exerciseId: we.exerciseId, sets: Math.max(1, sets), supersetGroup: we.supersetGroup ?? null });
  }
  return saveRoutine({ name: workout.name, description: '', exercises });
}
