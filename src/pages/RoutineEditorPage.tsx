import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/Sheet';
import { db } from '../db';
import { ExercisePicker } from '../features/exercises/ExercisePicker';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useToast } from '../hooks/toast';
import { deleteRoutine, saveRoutine } from '../services/routines';
import { ValidationError } from '../services/exercises';
import { regroup, startWorkout, supersetLabels } from '../services/workouts';
import type { RoutineExercise } from '../types';
import { useI18n } from '../i18n/react';

export default function RoutineEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const { t, pl, exerciseName, muscleName } = useI18n();
  const routine = useLiveQuery(() => (isNew ? null : db.routines.get(id!).then((r) => r ?? null)), [id]);
  const names = useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])), []);
  const [loaded, setLoaded] = useState(isNew);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<RoutineExercise[]>([]);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (routine && !loaded) {
      setName(routine.name);
      setDescription(routine.description);
      setItems(routine.exercises);
      setLoaded(true);
    }
  }, [routine, loaded]);

  if (!isNew && routine === null) {
    return (
      <main className="page" id="main">
        <PageHeader title={t('routine.notFound')} back="/routines" />
      </main>
    );
  }

  const labels = supersetLabels(items);
  const linked = (i: number) => !!items[i].supersetGroup && items[i].supersetGroup === items[i + 1]?.supersetGroup;
  const relink = (next: RoutineExercise[], links: boolean[]) => setItems(regroup(next, links));
  const links = () => items.slice(0, -1).map((_, i) => linked(i));

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    relink(next, next.slice(0, -1).map((x, k) => !!x.supersetGroup && x.supersetGroup === next[k + 1].supersetGroup));
  }

  async function save(andStart = false) {
    try {
      const r = await saveRoutine({ name, description, exercises: items }, isNew ? undefined : id);
      if (andStart) {
        await startWorkout({ routineId: r.id });
        navigate('/workout');
      } else navigate('/routines', { replace: true });
      toast({ message: t('detail.routineSaved'), detail: r.name });
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : t('routine.saveFailed'));
    }
  }

  return (
    <main className="page has-bar" id="main">
      <PageHeader title={isNew ? t('routine.new') : t('routine.edit')} back="/routines" />
      <label className="field">
        <span>{t('common.name')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('routine.namePh')} />
      </label>
      <label className="field">
        <span>{t('routine.desc')}</span>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="section-title">
        <h2>{t('exl.title')}</h2>
        <span className="small faint">{items.length}</span>
      </div>
      {items.length === 0 && <p className="muted small">{t('routine.emptyHint')}</p>}
      <ol className="list">
        {items.map((it, i) => {
          const ex = names?.get(it.exerciseId);
          const exName = exerciseName(ex);
          return (
            <li key={`${it.exerciseId}-${i}`} className={`card${labels[i] ? ' ex-card in-superset' : ''}`} style={{ padding: 12 }}>
              <div className="spread">
                <div className="grow">
                  <strong>
                    {labels[i] && <span className="ss-badge">{labels[i]}</span>}
                    {exName}
                  </strong>
                  <div className="small muted">{muscleName(ex?.muscleGroup)}</div>
                </div>
                <div className="row" style={{ gap: 2 }}>
                  <button type="button" className="icon-btn" aria-label={t('routine.fewer', { name: exName })} onClick={() => setItems(items.map((x, k) => (k === i ? { ...x, sets: Math.max(1, x.sets - 1) } : x)))}>
                    −
                  </button>
                  <span className="num" style={{ minWidth: 52, textAlign: 'center' }} aria-live="polite">
                    {pl(it.sets, 'set')}
                  </span>
                  <button type="button" className="icon-btn" aria-label={t('routine.more', { name: exName })} onClick={() => setItems(items.map((x, k) => (k === i ? { ...x, sets: Math.min(20, x.sets + 1) } : x)))}>
                    +
                  </button>
                </div>
              </div>
              <div className="row" style={{ marginTop: 6, gap: 4, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm btn-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('routine.moveUp', { name: exName })}>
                  <Icon name="up" size={18} />
                </button>
                <button type="button" className="btn btn-sm btn-ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t('routine.moveDown', { name: exName })}>
                  <Icon name="down" size={18} />
                </button>
                {i < items.length - 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    aria-pressed={linked(i)}
                    onClick={() => {
                      const l = links();
                      l[i] = !l[i];
                      relink(items, l);
                    }}
                  >
                    <Icon name="link" size={18} /> {linked(i) ? t('routine.unlink') : t('routine.superset')}
                  </button>
                )}
                <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', color: 'var(--danger)' }} onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={t('routine.remove', { name: exName })}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn btn-block" onClick={() => setPicking(true)}>
        <Icon name="plus" /> {t('workout.addExercises')}
      </button>
      {!isNew && (
        <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" /> {t('routine.delete')}
        </button>
      )}

      <nav className="workout-bar" aria-label={t('routine.actions')}>
        <div className="workout-bar-inner">
          <button type="button" className="btn" onClick={() => save(false)}>
            {t('common.save')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => save(true)} disabled={items.length === 0}>
            {t('routine.saveStart')}
          </button>
        </div>
      </nav>

      {picking && (
        <ExercisePicker
          multi
          title={t('routine.addTo')}
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            setItems([...items, ...ids.map((exerciseId) => ({ exerciseId, sets: 3, supersetGroup: null }))]);
            setPicking(false);
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t('routine.deleteTitle')}
          message={t('routine.deleteMsg')}
          confirmLabel={t('common.delete')}
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteRoutine(id!);
            navigate('/routines', { replace: true });
          }}
        />
      )}
    </main>
  );
}
