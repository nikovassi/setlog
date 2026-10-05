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
import { useI18n } from '../i18n/react';
import { estimate1RM, isWorkingSet, setVolume, totalVolume } from '../utils/calc';
import { formatDuration, formatLongDate, formatNumber, formatTime, formatWeight } from '../utils/format';

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t, pl, exerciseName } = useI18n();
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
        <PageHeader title={t('detail.workout')} back="/history" />
        <EmptyState icon="history" title={t('detail.notFound')}>
          {t('detail.notFoundText')}
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
    if (snap) toast({ message: t('detail.deleted'), detail: workout.name, action: { label: t('common.undo'), onClick: () => void restoreWorkout(snap) } });
  }

  async function saveAsRoutine() {
    const r = await routineFromWorkout(workout);
    toast({ message: t('detail.routineSaved'), detail: r.name, action: { label: t('common.open'), onClick: () => navigate(`/routines/${r.id}`) } });
  }

  return (
    <main className="page" id="main">
      <PageHeader
        title={workout.name}
        back="/history"
        actions={
          <button type="button" className="btn btn-sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
            {editing ? t('common.done') : t('common.edit')}
          </button>
        }
      />
      {justFinished && (
        <div className="notice" role="status">
          <Icon name="trophy" />
          <div className="grow">
            <strong>{t('detail.complete')}</strong>
            <div className="small">
              {pl(workingSets, 'set')} · {formatNumber(totalVolume(allSets))} {t('common.kg')}
              {prs && prs.size > 0 ? ` · ${pl(prs.size, 'pr')}` : ''}
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label={t('common.dismiss')} onClick={() => setParams({}, { replace: true })}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      <section className="card stack-sm" aria-label={t('detail.summary')}>
        <div className="spread">
          <span className="muted">{formatLongDate(workout.date)}</span>
          <span className="muted num">
            {formatTime(workout.startTime)}
            {workout.endTime ? `–${formatTime(workout.endTime)}` : ''}
          </span>
        </div>
        <dl className="stat-grid">
          <div className="stat">
            <dt>{t('stat.time')}</dt>
            <dd>{formatDuration(workout.duration)}</dd>
          </div>
          <div className="stat">
            <dt>{t('stat.sets')}</dt>
            <dd>{workingSets}</dd>
          </div>
          <div className="stat">
            <dt>{t('stat.volume')}</dt>
            <dd>
              {formatNumber(totalVolume(allSets))} <small>{t('common.kg')}</small>
            </dd>
          </div>
        </dl>
        {workout.notes && <p className="ex-notes" style={{ margin: 0 }}>“{workout.notes}”</p>}
      </section>

      {editing ? (
        <>
          <button type="button" className="btn btn-block" onClick={() => setEditMeta(true)}>
            <Icon name="edit" /> {t('detail.editMeta')}
          </button>
          <WorkoutEditor data={data} mode="edit" prSetIds={prs} />
          <button type="button" className="btn btn-block" onClick={() => setPicking(true)}>
            <Icon name="plus" /> {t('workout.addExercise')}
          </button>
          <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" /> {t('detail.delete')}
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
                        {exerciseName(item.exercise)}
                      </Link>
                    ) : (
                      exerciseName(undefined)
                    )}
                  </h2>
                  <span className="small muted num">
                    {formatNumber(totalVolume(sets))} {t('common.kg')}
                  </span>
                </div>
                {item.we.notes && <p className="small muted" style={{ fontStyle: 'italic' }}>“{item.we.notes}”</p>}
                <table className="set-table" style={{ marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th scope="col">{t('card.set')}</th>
                      <th scope="col">{t('detail.weightReps')}</th>
                      <th scope="col" className="r">
                        {t('stat.volume')}
                      </th>
                      <th scope="col" className="r">
                        {t('detail.e1rm')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((s, i) => (
                      <tr key={s.id}>
                        <td className={s.isWarmup ? 'faint' : ''}>{s.isWarmup ? t('set.warmupShort') : sets.slice(0, i + 1).filter((x) => !x.isWarmup).length}</td>
                        <td>
                          {formatWeight(s.weight)} {t('common.kg')} × {s.reps ?? 0}
                          {s.rpe ? <span className="muted"> @{s.rpe}</span> : null}
                          {prs?.has(s.id) && <span className="pr-tag"> {t('set.pr')}</span>}
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
          {items.length === 0 && <EmptyState icon="dumbbell" title={t('detail.noExercises')} />}
          <button type="button" className="btn btn-block" onClick={saveAsRoutine} disabled={items.length === 0}>
            <Icon name="copy" /> {t('detail.saveRoutine')}
          </button>
          <p className="small faint" style={{ textAlign: 'center' }}>
            {t('detail.e1rmNote')}
          </p>
        </>
      )}

      {picking && (
        <ExercisePicker
          multi
          title={t('workout.addExercises')}
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
          title={t('detail.deleteTitle')}
          message={t('detail.deleteMsg', { name: workout.name, sets: pl(allSets.length, 'set') })}
          confirmLabel={t('common.delete')}
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
  const { t } = useI18n();

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
    <Sheet
      title={t('workout.details')}
      onClose={onClose}
      focusFirstInput
      footer={
        <button type="button" className="btn btn-primary" onClick={save}>
          {t('common.save')}
        </button>
      }
    >
      <label className="field">
        <span>{t('common.name')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 10 }}>
        <label className="field grow">
          <span>{t('meta.date')}</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field grow">
          <span>{t('meta.start')}</span>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>{t('meta.duration')}</span>
        <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
      </label>
      <label className="field">
        <span>{t('common.note')}</span>
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
    </Sheet>
  );
}
