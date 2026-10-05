export type ID = string;

export type ExerciseCategory = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

export interface Exercise {
  id: ID;
  name: string;
  category: ExerciseCategory;
  muscleGroup: string;
  equipment: string;
  notes?: string;
  isCustom: boolean;
  createdAt: string;
  /** Per-exercise progression overrides (fallback: settings). */
  repMin?: number;
  repMax?: number;
  weightStep?: number;
  archived?: boolean;
}

export type WorkoutStatus = 'active' | 'completed';

export interface Workout {
  id: ID;
  name: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** ISO timestamps. */
  startTime: string;
  endTime: string | null;
  /** Seconds. */
  duration: number | null;
  notes: string;
  status: WorkoutStatus;
  routineId?: ID | null;
}

export interface WorkoutExercise {
  id: ID;
  workoutId: ID;
  exerciseId: ID;
  order: number;
  notes: string;
  /** Exercises sharing the same group id form a superset. */
  supersetGroup?: string | null;
}

export interface WorkoutSet {
  id: ID;
  workoutExerciseId: ID;
  workoutId: ID;
  exerciseId: ID;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  completed: boolean;
  timestamp: string;
  notes?: string;
}

export interface RoutineExercise {
  exerciseId: ID;
  sets: number;
  supersetGroup?: string | null;
}

export interface Routine {
  id: ID;
  name: string;
  description: string;
  exercises: RoutineExercise[];
  createdAt: string;
  updatedAt: string;
}

export type Theme = 'dark' | 'light';
export type Language = 'en' | 'bg';

export interface Settings {
  theme: Theme;
  language: Language;
  /** Seconds. */
  defaultRest: number;
  autoRest: boolean;
  repMin: number;
  repMax: number;
  weightStep: number;
}

export interface SettingRow {
  key: keyof Settings;
  value: Settings[keyof Settings];
}
