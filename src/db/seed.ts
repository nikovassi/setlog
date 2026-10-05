import type { Exercise, ExerciseCategory } from '../types';

type SeedRow = [name: string, muscleGroup: string, equipment: string, category: ExerciseCategory];

const ROWS: SeedRow[] = [
  ['Bench Press', 'Chest', 'Barbell', 'barbell'],
  ['Incline Bench Press', 'Chest', 'Barbell', 'barbell'],
  ['Dumbbell Bench Press', 'Chest', 'Dumbbell', 'dumbbell'],
  ['Incline Dumbbell Press', 'Chest', 'Dumbbell', 'dumbbell'],
  ['Chest Fly', 'Chest', 'Machine', 'machine'],
  ['Dip', 'Chest', 'Bodyweight', 'bodyweight'],
  ['Push Up', 'Chest', 'Bodyweight', 'bodyweight'],
  ['Squat', 'Quads', 'Barbell', 'barbell'],
  ['Front Squat', 'Quads', 'Barbell', 'barbell'],
  ['Leg Press', 'Quads', 'Machine', 'machine'],
  ['Leg Extension', 'Quads', 'Machine', 'machine'],
  ['Bulgarian Split Squat', 'Quads', 'Dumbbell', 'dumbbell'],
  ['Deadlift', 'Back', 'Barbell', 'barbell'],
  ['Romanian Deadlift', 'Hamstrings', 'Barbell', 'barbell'],
  ['Leg Curl', 'Hamstrings', 'Machine', 'machine'],
  ['Hip Thrust', 'Glutes', 'Barbell', 'barbell'],
  ['Calf Raise', 'Calves', 'Machine', 'machine'],
  ['Overhead Press', 'Shoulders', 'Barbell', 'barbell'],
  ['Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'dumbbell'],
  ['Lateral Raise', 'Shoulders', 'Dumbbell', 'dumbbell'],
  ['Face Pull', 'Shoulders', 'Cable', 'cable'],
  ['Pull Up', 'Back', 'Bodyweight', 'bodyweight'],
  ['Chin Up', 'Back', 'Bodyweight', 'bodyweight'],
  ['Lat Pulldown', 'Back', 'Cable', 'cable'],
  ['Barbell Row', 'Back', 'Barbell', 'barbell'],
  ['Dumbbell Row', 'Back', 'Dumbbell', 'dumbbell'],
  ['Cable Row', 'Back', 'Cable', 'cable'],
  ['Biceps Curl', 'Biceps', 'Dumbbell', 'dumbbell'],
  ['Barbell Curl', 'Biceps', 'Barbell', 'barbell'],
  ['Hammer Curl', 'Biceps', 'Dumbbell', 'dumbbell'],
  ['Triceps Pushdown', 'Triceps', 'Cable', 'cable'],
  ['Skull Crusher', 'Triceps', 'Barbell', 'barbell'],
  ['Overhead Triceps Extension', 'Triceps', 'Cable', 'cable'],
  ['Plank', 'Core', 'Bodyweight', 'bodyweight'],
  ['Cable Crunch', 'Core', 'Cable', 'cable'],
  ['Hanging Leg Raise', 'Core', 'Bodyweight', 'bodyweight'],
];

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full body', 'Other',
];

export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band', 'Other'];

export function seedId(name: string): string {
  return 'ex-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function seedExercises(now = new Date(0).toISOString()): Exercise[] {
  return ROWS.map(([name, muscleGroup, equipment, category]) => ({
    id: seedId(name),
    name,
    muscleGroup,
    equipment,
    category,
    isCustom: false,
    createdAt: now,
  }));
}
