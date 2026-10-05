import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { db } from '../db';
import { ActiveWorkout } from '../features/workouts/ActiveWorkout';
import { useWorkoutData } from '../features/workouts/useWorkoutData';
import { useActiveWorkout } from '../hooks/useActiveWorkout';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useToast } from '../hooks/toast';
import { startWorkout } from '../services/workouts';

export default function WorkoutPage() {
  const active = useActiveWorkout();
  const data = useWorkoutData(active?.id);
  if (active === undefined || (active && data === undefined)) return <main className="page" aria-busy="true" />;
  if (active && data) return <ActiveWorkout data={data} />;
  return <StartWorkout />;
}

export function useStartWorkout() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const start = async (routineId?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await startWorkout({ routineId });
    } catch {
      toast({ message: 'Could not start the workout.', detail: 'Please try again.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return { start, busy };
}

function StartWorkout() {
  const { start, busy } = useStartWorkout();
  const routines = useLiveQuery(async () => {
    const [routines, exercises] = await Promise.all([db.routines.orderBy('updatedAt').reverse().toArray(), db.exercises.toArray()]);
    const names = new Map(exercises.map((e) => [e.id, e.name]));
    return routines.map((r) => ({ ...r, names: r.exercises.map((e) => names.get(e.exerciseId)).filter(Boolean) as string[] }));
  }, []);

  return (
    <main className="page" id="main">
      <PageHeader title="Start workout" />
      <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => start()} disabled={busy}>
        <Icon name="plus" /> Empty workout
      </button>
      <div className="section-title">
        <h2>Routines</h2>
        <Link to="/routines" className="small muted">
          Manage
        </Link>
      </div>
      {routines && routines.length === 0 && (
        <EmptyState
          icon="list"
          title="No routines yet"
          action={
            <Link to="/routines/new" className="btn">
              <Icon name="plus" /> Create routine
            </Link>
          }
        >
          Save your Push, Pull or Legs day once and start it with one tap.
        </EmptyState>
      )}
      <ul className="list">
        {routines?.map((r) => (
          <li key={r.id}>
            <button type="button" className="card card-link btn-block" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => start(r.id)} disabled={busy}>
              <div className="spread">
                <div className="grow">
                  <h3>{r.name}</h3>
                  <p className="small muted truncate">{r.names.join(' · ') || 'No exercises'}</p>
                </div>
                <span className="btn btn-sm btn-primary" aria-hidden>
                  Start
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
