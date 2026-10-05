import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { ConfirmDialog, Sheet } from '../../components/Sheet';
import { useRestTimer } from '../../hooks/restTimer';
import { useToast } from '../../hooks/toast';
import * as W from '../../services/workouts';
import { useI18n } from '../../i18n/react';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { Elapsed } from './Elapsed';
import { FinishSheet } from './FinishSheet';
import type { WorkoutData } from './useWorkoutData';
import { WorkoutEditor } from './WorkoutEditor';

export function ActiveWorkout({ data }: { data: WorkoutData }) {
  const navigate = useNavigate();
  const toast = useToast();
  const rest = useRestTimer();
  const { t, pl } = useI18n();
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
      toast({ message: t('workout.finishFailed'), detail: t('workout.finishFailedDetail'), tone: 'error' });
    }
  }

  async function discard() {
    await W.deleteWorkout(workout.id);
    rest.stop();
    setDiscarding(false);
    setFinishing(false);
    toast({ message: t('workout.discarded') });
    navigate('/', { replace: true });
  }

  return (
    <>
      <main className="page has-bar" id="main">
        <header className="workout-top">
          <div className="row">
            <div className="grow" style={{ minWidth: 0 }}>
              <button type="button" className="workout-title truncate" onClick={() => setEditing(true)} aria-label={t('workout.editName', { name: workout.name })}>
                {workout.name}
              </button>
              <div className="row small">
                <Elapsed since={workout.startTime} />
                <span className="faint">· {t('workout.setsDone', { sets: pl(completed, 'set') })}</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setFinishing(true)}>
              {t('workout.finish')}
            </button>
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title={t('workout.addFirst')}
            action={
              <button type="button" className="btn btn-primary" onClick={() => setPicking(true)}>
                <Icon name="plus" /> {t('workout.addExercise')}
              </button>
            }
          >
            {t('workout.addFirstText')}
          </EmptyState>
        ) : (
          <WorkoutEditor data={data} mode="active" />
        )}
        <button type="button" className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => (completed ? setDiscarding(true) : discard())}>
          {t('workout.discard')}
        </button>
      </main>

      <nav className="workout-bar" aria-label={t('workout.actions')}>
        <div className="workout-bar-inner">
          <button type="button" className="btn" onClick={() => setPicking(true)}>
            <Icon name="plus" /> {t('workout.exerciseBtn')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setFinishing(true)}>
            <Icon name="check" /> {t('workout.finish')}
          </button>
        </div>
      </nav>

      {picking && <ExercisePicker multi title={t('workout.addExercises')} onPick={addExercises} onClose={() => setPicking(false)} />}
      {finishing && <FinishSheet data={data} onClose={() => setFinishing(false)} onFinish={finish} onDiscard={discard} />}
      {discarding && (
        <ConfirmDialog
          title={t('workout.discardTitle')}
          message={t('workout.discardMsg', { sets: pl(completed, 'completedSet') })}
          confirmLabel={t('workout.discardConfirm')}
          danger
          onCancel={() => setDiscarding(false)}
          onConfirm={discard}
        />
      )}
      {editing && (
        <Sheet
          title={t('workout.details')}
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
              {t('common.save')}
            </button>
          }
        >
          <label className="field">
            <span>{t('common.name')}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('workout.note')}</span>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('workout.notePh')} />
          </label>
        </Sheet>
      )}
    </>
  );
}
