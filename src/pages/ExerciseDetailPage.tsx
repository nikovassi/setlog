import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BarChartCard, LineChartCard } from '../components/Charts';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog, Sheet } from '../components/Sheet';
import { db } from '../db';
import { ExerciseForm } from '../features/exercises/ExerciseForm';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/toast';
import { deleteExercise, updateExercise, ValidationError } from '../services/exercises';
import { exerciseSeries } from '../services/stats';
import { exerciseHistory } from '../services/workouts';
import { bestE1RM, estimate1RM, totalVolume } from '../utils/calc';
import { formatDayMonth, formatNumber, formatWeight, setLabel } from '../utils/format';
import { exerciseRecords } from '../utils/pr';
import { useI18n } from '../i18n/react';

export default function ExerciseDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const { t, pl, exerciseName, muscleName, equipmentName } = useI18n();
  const [editing, setEditing] = useState(false);
  const [progression, setProgression] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = useLiveQuery(async () => {
    const exercise = await db.exercises.get(id);
    if (!exercise) return null;
    const sessions = await exerciseHistory(id);
    const sets = sessions.flatMap((s) => s.sets);
    const series = exerciseSeries({ workouts: sessions.map((s) => s.workout), sets }, id);
    return { exercise, sessions, records: exerciseRecords(sets), series };
  }, [id]);

  if (data === undefined) return <main className="page" aria-busy="true" />;
  if (data === null)
    return (
      <main className="page" id="main">
        <PageHeader title={t('exd.title')} back />
        <EmptyState icon="dumbbell" title={t('exd.notFound')} />
      </main>
    );

  const { exercise, sessions, records, series } = data;
  const recordRows = [
    { label: t('rec.heaviest'), set: records.maxWeight, value: records.maxWeight && setLabel(records.maxWeight.weight, records.maxWeight.reps) },
    { label: t('rec.e1rm'), set: records.bestE1RM, value: records.bestE1RM && `${formatWeight(estimate1RM(records.bestE1RM.weight, records.bestE1RM.reps))} ${t('common.kg')}` },
    { label: t('rec.volume'), set: records.bestVolume, value: records.bestVolume && `${formatNumber((records.bestVolume.weight ?? 0) * (records.bestVolume.reps ?? 0))} ${t('common.kg')}` },
    { label: t('rec.reps'), set: records.maxReps, value: records.maxReps && setLabel(records.maxReps.weight, records.maxReps.reps) },
  ];

  return (
    <main className="page" id="main">
      <PageHeader
        title={exerciseName(exercise)}
        back
        actions={
          <button type="button" className="icon-btn" aria-label={t('exd.edit')} onClick={() => setEditing(true)}>
            <Icon name="edit" />
          </button>
        }
      />
      <p className="muted" style={{ marginTop: -12 }}>
        {muscleName(exercise.muscleGroup)} · {equipmentName(exercise.equipment)}
        {exercise.isCustom ? ` · ${t('common.custom')}` : ''}
      </p>
      {exercise.notes && <p className="ex-notes" style={{ margin: 0 }}>“{exercise.notes}”</p>}

      <button type="button" className="card card-link spread" style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }} onClick={() => setProgression(true)}>
        <span>
          <span className="small muted" style={{ display: 'block' }}>
            {t('exd.target')}
          </span>
          <strong className="num">
            {t('exd.targetValue', { min: exercise.repMin ?? settings.repMin, max: exercise.repMax ?? settings.repMax, step: formatWeight(exercise.weightStep ?? settings.weightStep) })}
          </strong>
        </span>
        <Icon name="edit" size={18} />
      </button>

      {sessions.length === 0 ? (
        <EmptyState icon="chart" title={t('exd.noHistory')}>
          {t('exd.noHistoryText')}
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="rec-h">
            <div className="section-title">
              <h2 id="rec-h">{t('exd.records')}</h2>
            </div>
            <dl className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
              {recordRows.map((r) => (
                <div className="stat" key={r.label}>
                  <dt>{r.label}</dt>
                  <dd style={{ fontSize: '1.05rem' }}>{r.value ?? '–'}</dd>
                  {r.set && <div className="small faint">{formatDayMonth(sessions.find((s) => s.workout.id === r.set!.workoutId)?.workout.date ?? '')}</div>}
                </div>
              ))}
            </dl>
          </section>

          {series.length >= 2 && (
            <section className="stack" aria-label={t('exd.charts')}>
              <LineChartCard title={t('chart.weight')} unit={t('common.kg')} data={series.map((p) => ({ label: p.label, value: p.weight }))} summary={t('chart.range', { a: series[0].weight, b: series.at(-1)!.weight })} />
              <LineChartCard title={t('chart.e1rm')} unit={t('common.kg')} data={series.map((p) => ({ label: p.label, value: p.e1rm }))} summary={t('chart.range', { a: series[0].e1rm, b: series.at(-1)!.e1rm })} />
              <BarChartCard title={t('chart.volumeSession')} unit={t('common.kg')} data={series.map((p) => ({ label: p.label, value: p.volume }))} summary={t('chart.latest', { v: series.at(-1)!.volume })} />
            </section>
          )}

          <section aria-labelledby="hist-h">
            <div className="section-title">
              <h2 id="hist-h">{t('exd.history')}</h2>
              <span className="small faint">{pl(sessions.length, 'session')}</span>
            </div>
            <ul className="list" style={{ marginTop: 8 }}>
              {sessions.map((s) => (
                <li key={s.workoutExercise.id}>
                  <Link to={`/history/${s.workout.id}`} className="card card-link">
                    <div className="spread">
                      <strong>{formatDayMonth(s.workout.date)}</strong>
                      <span className="small muted num">
                        {formatNumber(totalVolume(s.sets))} {t('common.kg')} · 1RM {formatWeight(bestE1RM(s.sets))}
                      </span>
                    </div>
                    <ol className="meta" style={{ listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
                      {s.sets.map((x) => (
                        <li key={x.id} className={x.isWarmup ? 'faint' : ''}>
                          {x.isWarmup ? `${t('set.warmupShort')} ` : ''}
                          {setLabel(x.weight, x.reps)}
                          {x.rpe ? ` @${x.rpe}` : ''}
                        </li>
                      ))}
                    </ol>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <p className="small faint" style={{ textAlign: 'center' }}>
            {t('exd.formula')}
          </p>
        </>
      )}

      {exercise.isCustom && (
        <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" /> {t('exd.delete')}
        </button>
      )}

      {editing && (
        <Sheet title={t('exd.edit')} onClose={() => setEditing(false)} focusFirstInput>
          <ExerciseForm exercise={exercise} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
        </Sheet>
      )}
      {progression && <ProgressionSheet exerciseId={exercise.id} initial={{ repMin: exercise.repMin ?? settings.repMin, repMax: exercise.repMax ?? settings.repMax, weightStep: exercise.weightStep ?? settings.weightStep }} onClose={() => setProgression(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title={t('exd.deleteTitle')}
          message={sessions.length ? t('exd.deleteHasHistory') : t('exd.deleteNoHistory')}
          confirmLabel={t('common.delete')}
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteExercise(exercise.id);
            toast({ message: t('exd.deleted', { name: exerciseName(exercise) }) });
            navigate('/exercises', { replace: true });
          }}
        />
      )}
    </main>
  );
}

function ProgressionSheet({ exerciseId, initial, onClose }: { exerciseId: string; initial: { repMin: number; repMax: number; weightStep: number }; onClose: () => void }) {
  const [repMin, setMin] = useState(String(initial.repMin));
  const [repMax, setMax] = useState(String(initial.repMax));
  const [step, setStep] = useState(String(initial.weightStep));
  const [error, setError] = useState('');
  const { t } = useI18n();

  async function save() {
    const min = parseInt(repMin, 10), max = parseInt(repMax, 10), st = parseFloat(step.replace(',', '.'));
    if (!(min > 0 && max > 0 && st > 0)) return setError(t('prog.positive'));
    try {
      await updateExercise(exerciseId, { repMin: min, repMax: max, weightStep: st });
      onClose();
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : t('prog.saveFailed'));
    }
  }

  return (
    <Sheet
      title={t('exd.target')}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={save}>
          {t('common.save')}
        </button>
      }
    >
      <p className="small muted">
        {t('prog.hint')}
      </p>
      <div className="row" style={{ gap: 10 }}>
        <label className="field grow">
          <span>{t('prog.min')}</span>
          <input className="input" inputMode="numeric" value={repMin} onChange={(e) => setMin(e.target.value)} />
        </label>
        <label className="field grow">
          <span>{t('prog.max')}</span>
          <input className="input" inputMode="numeric" value={repMax} onChange={(e) => setMax(e.target.value)} />
        </label>
        <label className="field grow">
          <span>{t('prog.step')}</span>
          <input className="input" inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} />
        </label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Sheet>
  );
}
