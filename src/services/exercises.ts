import { db } from '../db';
import type { Exercise, ExerciseCategory } from '../types';
import { t } from '../i18n';
import { newId } from '../utils/id';

export interface ExerciseInput {
  name: string;
  muscleGroup: string;
  equipment: string;
  notes?: string;
  repMin?: number;
  repMax?: number;
  weightStep?: number;
}

function categoryFor(equipment: string): ExerciseCategory {
  const e = equipment.toLowerCase();
  if (e === 'barbell' || e === 'dumbbell' || e === 'machine' || e === 'cable' || e === 'bodyweight') return e;
  return 'other';
}

export class ValidationError extends Error {}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const name = input.name.trim();
  if (!name) throw new ValidationError(t('err.nameRequired'));
  const clash = await db.exercises.filter((e) => !e.archived && e.name.toLowerCase() === name.toLowerCase()).first();
  if (clash) throw new ValidationError(t('err.exists', { name: clash.name }));
  const ex: Exercise = {
    id: newId(),
    name,
    muscleGroup: input.muscleGroup || 'Other',
    equipment: input.equipment || 'Other',
    category: categoryFor(input.equipment),
    notes: input.notes?.trim() || undefined,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
  await db.exercises.add(ex);
  return ex;
}

export async function updateExercise(id: string, patch: Partial<ExerciseInput>): Promise<void> {
  const changes: Partial<Exercise> = { ...patch };
  if (patch.name !== undefined) {
    changes.name = patch.name.trim();
    if (!changes.name) throw new ValidationError(t('err.nameRequired'));
  }
  if (patch.equipment) changes.category = categoryFor(patch.equipment);
  if (patch.repMin !== undefined && patch.repMax !== undefined && patch.repMin > patch.repMax) {
    throw new ValidationError(t('err.repRange'));
  }
  await db.exercises.update(id, changes);
}

/** Custom exercises with history are archived (hidden), never hard-deleted, so history stays intact. */
export async function deleteExercise(id: string): Promise<'deleted' | 'archived'> {
  const used = await db.workoutExercises.where('exerciseId').equals(id).count();
  if (used > 0) {
    await db.exercises.update(id, { archived: true });
    return 'archived';
  }
  await db.exercises.delete(id);
  return 'deleted';
}
