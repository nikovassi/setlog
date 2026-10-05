import { useState, type FormEvent } from 'react';
import { EQUIPMENT, MUSCLE_GROUPS } from '../../db/seed';
import { createExercise, updateExercise, ValidationError } from '../../services/exercises';
import type { Exercise } from '../../types';

interface Props {
  exercise?: Exercise;
  initialName?: string;
  onSaved: (ex: Exercise | undefined) => void;
  onCancel: () => void;
}

export function ExerciseForm({ exercise, initialName = '', onSaved, onCancel }: Props) {
  const [name, setName] = useState(exercise?.name ?? initialName);
  const [muscleGroup, setMuscle] = useState(exercise?.muscleGroup ?? 'Chest');
  const [equipment, setEquipment] = useState(exercise?.equipment ?? 'Barbell');
  const [notes, setNotes] = useState(exercise?.notes ?? '');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (exercise) {
        await updateExercise(exercise.id, { name, muscleGroup, equipment, notes });
        onSaved(undefined);
      } else {
        onSaved(await createExercise({ name, muscleGroup, equipment, notes }));
      }
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Could not save the exercise. Please try again.');
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <label className="field">
        <span>Name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required placeholder="e.g. Cable Lateral Raise" />
      </label>
      <div className="row" style={{ gap: 10 }}>
        <label className="field grow">
          <span>Muscle group</span>
          <select className="select" value={muscleGroup} onChange={(e) => setMuscle(e.target.value)}>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="field grow">
          <span>Equipment</span>
          <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            {EQUIPMENT.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Notes (optional)</span>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Seat height 4, neutral grip…" />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="button" className="btn grow" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary grow">
          {exercise ? 'Save' : 'Create exercise'}
        </button>
      </div>
    </form>
  );
}
