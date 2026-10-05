import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { ConfirmDialog, Sheet } from '../../components/Sheet';
import { useRestTimer } from '../../hooks/restTimer';
import { useToast } from '../../hooks/toast';
import * as W from '../../services/workouts';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { plural } from '../../utils/plural';
import { Elapsed } from './Elapsed';
import { FinishSheet } from './FinishSheet';
import type { WorkoutData } from './useWorkoutData';
import { WorkoutEditor } from './WorkoutEditor';

export function ActiveWorkout({ data }: { data: WorkoutData }) {
  const navigate = useNavigate();
  const toast = useToast();
  const rest = useRestTimer();
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data.workout.name);
  const [notes, setNotes] = useState(data.workout.notes);
  const { workout, items } = data;
  const completed = items.reduce((n, i) => n + i.sets.filter((s) => s.completed).length, 0);

  async function addExercises(ids: string[]) {
    setPicking(false);
    for (const id of ids) await W.addExerciseToWorkout(workout.id, id);
    // Bring the new card into view so the user can log straight away.
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  }

  async function finish(keepFilled: boolean) {
    try {
      const res = await W.finishWorkout(workout.id, keepFilled);
      rest.stop();
      // Ask the browser not to evict our data under storage pressure (no-op where unsupported).
      void navigator.storage?.persist?.().catch(() => {});
      navigate(`/history/${res.workout.id}?done=1`, { replace: true });
    } catch {
      toast({ message: 'Could not finish the workout.', detail: 'Your data is safe – please try again.', tone: 'error' });
    }
  }

  async function discard() {
    await W.deleteWorkout(workout.id);
    rest.stop();
    setDiscarding(false);
    setFinishing(false);
    toast({ message: 'Workout discarded' });
    navigate('/', { replace: true });
  }

  return (
    <>
      <main className="page has-bar" id="main">
        <header className="workout-top">
          <div className="row">
            <div className="grow" style={{ minWidth: 0 }}>
              <button type="button" className="workout-title truncate" onClick={() => setEditing(true)} aria-label={`Workout name: ${workout.name}. Edit`}>
                {workout.name}
              </button>
              <div className="row small">
                <Elapsed since={workout.startTime} />
                <span className="faint">· {plural(completed, 'set')} done</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setFinishing(true)}>
              Finish
            </button>
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title="Add your first exercise"
            action={
              <button type="button" className="btn btn-primary" onClick={() => setPicking(true)}>
                <Icon name="plus" /> Add exercise
              </button>
            }
          >
            Pick an exercise and your last performance will appear right here.
          </EmptyState>
        ) : (
          <WorkoutEditor data={data} mode="active" />
        )}
        <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => (completed ? setDiscarding(true) : discard())}>
          Discard workout
        </button>
      </main>

      <nav className="workout-bar" aria-label="Workout actions">
        <div className="workout-bar-inner">
          <button type="button" className="btn" onClick={() => setPicking(true)}>
            <Icon name="plus" /> Exercise
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setFinishing(true)}>
            <Icon name="check" /> Finish
          </button>
        </div>
      </nav>

      {picking && <ExercisePicker multi title="Add exercises" onPick={addExercises} onClose={() => setPicking(false)} />}
      {finishing && <FinishSheet data={data} onClose={() => setFinishing(false)} onFinish={finish} onDiscard={discard} />}
      {discarding && (
        <ConfirmDialog
          title="Discard workout?"
          message={`${plural(completed, 'completed set')} will be permanently deleted.`}
          confirmLabel="Discard"
          danger
          onCancel={() => setDiscarding(false)}
          onConfirm={discard}
        />
      )}
      {editing && (
        <Sheet
          title="Workout details"
          focusFirstInput
          onClose={() => setEditing(false)}
          footer={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                void W.updateWorkout(workout.id, { name: name.trim() || workout.name, notes: notes.trim() });
                setEditing(false);
              }}
            >
              Save
            </button>
          }
        >
          <label className="field">
            <span>Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Workout note</span>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Slept badly, good energy…" />
          </label>
        </Sheet>
      )}
    </>
  );
}
