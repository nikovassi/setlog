import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog, Sheet } from '../components/Sheet';
import { useWorkoutData } from '../features/workouts/useWorkoutData';
import { WorkoutEditor } from '../features/workouts/WorkoutEditor';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useToast } from '../hooks/toast';
import { routineFromWorkout } from '../services/routines';
import { loadDataset, prTimeline } from '../services/stats';
import { addExerciseToWorkout, deleteWorkout, restoreWorkout, updateWorkout } from '../services/workouts';
import { ExercisePicker } from '../features/exercises/ExercisePicker';
import { estimate1RM, isWorkingSet, setVolume, totalVolume } from '../utils/calc';
import { plural } from '../utils/plural';
import { formatDuration, formatLongDate, formatNumber, formatTime, formatWeight } from '../utils/format';

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const data = useWorkoutData(id, false);
  const prs = useLiveQuery(async () => {
    const timeline = prTimeline(await loadDataset());
    return new Set(timeline.filter((p) => p.set.workoutId === id).map((p) => p.set.id));
  }, [id]);
  const [editing, setEditing] = useState(false);
  const [editMeta, setEditMeta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picking, setPicking] = useState(false);
  const justFinished = params.get('done') === '1';

  const allSets = useMemo(() => data?.items.flatMap((i) => i.sets) ?? [], [data]);

  if (data === undefined) return <main className="page" aria-busy="true" />;
  if (data === null)
    return (
      <main className="page" id="main">
        <PageHeader title="Workout" back="/history" />
        <EmptyState icon="history" title="Workout not found">
          It may have been deleted.
        </EmptyState>
      </main>
    );

  const { workout, items } = data;
  if (workout.status === 'active') return <Navigate to="/workout" replace />;
  const workingSets = allSets.filter(isWorkingSet).length;

  async function remove() {
    setConfirmDelete(false);
    const snap = await deleteWorkout(workout.id);
    navigate('/history', { replace: true });
    if (snap) toast({ message: 'Workout deleted', detail: workout.name, action: { label: 'Undo', onClick: () => void restoreWorkout(snap) } });
  }

  async function saveAsRoutine() {
    const r = await routineFromWorkout(workout);
    toast({ message: 'Routine saved', detail: r.name, action: { label: 'Open', onClick: () => navigate(`/routines/${r.id}`) } });
  }

  return (
    <main className="page" id="main">
      <PageHeader
        title={workout.name}
        back="/history"
        actions={
          <button type="button" className="btn btn-sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
            {editing ? 'Done' : 'Edit'}
          </button>
        }
      />
      {justFinished && (
        <div className="notice" role="status">
          <Icon name="trophy" />
          <div className="grow">
            <strong>Workout complete!</strong>
            <div className="small">
              {plural(workingSets, 'set')} · {formatNumber(totalVolume(allSets))} kg{prs && prs.size > 0 ? ` · ${plural(prs.size, 'PR')}` : ''}
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setParams({}, { replace: true })}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      <section className="card stack-sm" aria-label="Summary">
        <div className="spread">
          <span className="muted">{formatLongDate(workout.date)}</span>
          <span className="muted num">
            {formatTime(workout.startTime)}
            {workout.endTime ? `–${formatTime(workout.endTime)}` : ''}
          </span>
        </div>
        <dl className="stat-grid">
          <div className="stat">
            <dt>Time</dt>
            <dd>{formatDuration(workout.duration)}</dd>
          </div>
          <div className="stat">
            <dt>Sets</dt>
            <dd>{workingSets}</dd>
          </div>
          <div className="stat">
            <dt>Volume</dt>
            <dd>
              {formatNumber(totalVolume(allSets))} <small>kg</small>
            </dd>
          </div>
        </dl>
        {workout.notes && <p className="ex-notes" style={{ margin: 0 }}>“{workout.notes}”</p>}
      </section>

      {editing ? (
        <>
          <button type="button" className="btn btn-block" onClick={() => setEditMeta(true)}>
            <Icon name="edit" /> Edit name, date, time & note
          </button>
          <WorkoutEditor data={data} mode="edit" prSetIds={prs} />
          <button type="button" className="btn btn-block" onClick={() => setPicking(true)}>
            <Icon name="plus" /> Add exercise
          </button>
          <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" /> Delete workout
          </button>
        </>
      ) : (
        <>
          {items.map((item) => {
            const sets = item.sets;
            return (
              <article key={item.we.id} className={`card${item.label ? ' ex-card in-superset' : ''}`} style={item.label ? { padding: 14 } : undefined}>
                <div className="spread">
                  <h2 style={{ fontSize: '1.02rem' }}>
                    {item.label && <span className="ss-badge">{item.label}</span>}
                    {item.exercise ? (
                      <Link to={`/exercise/${item.exercise.id}`} className="ex-name">
                        {item.exercise.name}
                      </Link>
                    ) : (
                      'Unknown exercise'
                    )}
                  </h2>
                  <span className="small muted num">{formatNumber(totalVolume(sets))} kg</span>
                </div>
                {item.we.notes && <p className="small muted" style={{ fontStyle: 'italic' }}>“{item.we.notes}”</p>}
                <table className="set-table" style={{ marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th scope="col">Set</th>
                      <th scope="col">Weight × reps</th>
                      <th scope="col" className="r">
                        Volume
                      </th>
                      <th scope="col" className="r">
                        Est. 1RM
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((s, i) => (
                      <tr key={s.id}>
                        <td className={s.isWarmup ? 'faint' : ''}>{s.isWarmup ? 'W' : sets.slice(0, i + 1).filter((x) => !x.isWarmup).length}</td>
                        <td>
                          {formatWeight(s.weight)} kg × {s.reps ?? 0}
                          {s.rpe ? <span className="muted"> @{s.rpe}</span> : null}
                          {prs?.has(s.id) && <span className="pr-tag"> ★ PR</span>}
                          {s.notes && <div className="small muted">“{s.notes}”</div>}
                        </td>
                        <td className="r">{s.isWarmup ? '–' : formatNumber(setVolume(s))}</td>
                        <td className="r">{s.isWarmup ? '–' : formatWeight(estimate1RM(s.weight, s.reps))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            );
          })}
          {items.length === 0 && <EmptyState icon="dumbbell" title="No exercises in this workout" />}
          <button type="button" className="btn btn-block" onClick={saveAsRoutine} disabled={items.length === 0}>
            <Icon name="copy" /> Save as routine
          </button>
          <p className="small faint" style={{ textAlign: 'center' }}>
            Est. 1RM uses the Epley formula and is an estimate, not a tested max.
          </p>
        </>
      )}

      {picking && (
        <ExercisePicker
          multi
          title="Add exercises"
          onClose={() => setPicking(false)}
          onPick={async (ids) => {
            setPicking(false);
            for (const exId of ids) await addExerciseToWorkout(workout.id, exId);
          }}
        />
      )}
      {editMeta && <MetaSheet workoutId={workout.id} initial={workout} onClose={() => setEditMeta(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete workout?"
          message={`“${workout.name}” with ${plural(allSets.length, 'set')} will be deleted.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={remove}
        />
      )}
    </main>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function MetaSheet({ workoutId, initial, onClose }: { workoutId: string; initial: { name: string; notes: string; date: string; startTime: string; duration: number | null }; onClose: () => void }) {
  const [name, setName] = useState(initial.name);
  const [notes, setNotes] = useState(initial.notes);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(toLocalInput(initial.startTime));
  const [minutes, setMinutes] = useState(String(Math.round((initial.duration ?? 0) / 60)));

  function save() {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const start = new Date(y, m - 1, d, hh || 0, mm || 0);
    if (Number.isNaN(start.getTime())) return;
    const mins = Math.max(0, parseInt(minutes, 10) || 0);
    void updateWorkout(workoutId, {
      name: name.trim() || initial.name,
      notes: notes.trim(),
      date,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + mins * 60000).toISOString(),
    });
    onClose();
  }

  return (
    <Sheet title="Workout details" onClose={onClose} focusFirstInput footer={<button type="button" className="btn btn-primary" onClick={save}>Save</button>}>
      <label className="field">
        <span>Name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 10 }}>
        <label className="field grow">
          <span>Date</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field grow">
          <span>Start</span>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Duration (minutes)</span>
        <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
      </label>
      <label className="field">
        <span>Note</span>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
    </Sheet>
  );
}
