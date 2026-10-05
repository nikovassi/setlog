import { db } from '../db';
import type { Workout } from '../types';
import { useLiveQuery } from './useLiveQuery';

/** undefined while loading, null when no workout is running. */
export function useActiveWorkout(): Workout | null | undefined {
  return useLiveQuery(async () => (await db.workouts.where('status').equals('active').first()) ?? null, []);
}
