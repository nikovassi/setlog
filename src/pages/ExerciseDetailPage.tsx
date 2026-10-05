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
import { plural } from '../utils/plural';

export default function ExerciseDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useSettings();
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
        <PageHeader title="Exercise" back />
        <EmptyState icon="dumbbell" title="Exercise not found" />
      </main>
    );

  const { exercise, sessions, records, series } = data;
  const recordRows = [
    { label: 'Heaviest', set: records.maxWeight, value: records.maxWeight && setLabel(records.maxWeight.weight, records.maxWeight.reps) },
    { label: 'Best est. 1RM', set: records.bestE1RM, value: records.bestE1RM && `${formatWeight(estimate1RM(records.bestE1RM.weight, records.bestE1RM.reps))} kg` },
    { label: 'Best set volume', set: records.bestVolume, value: records.bestVolume && `${formatNumber((records.bestVolume.weight ?? 0) * (records.bestVolume.reps ?? 0))} kg` },
    { label: 'Most reps', set: records.maxReps, value: records.maxReps && setLabel(records.maxReps.weight, records.maxReps.reps) },
  ];

  return (
    <main className="page" id="main">
      <PageHeader
        title={exercise.name}
        back
        actions={
          <button type="button" className="icon-btn" aria-label="Edit exercise" onClick={() => setEditing(true)}>
            <Icon name="edit" />
          </button>
        }
      />
      <p className="muted" style={{ marginTop: -12 }}>
        {exercise.muscleGroup} · {exercise.equipment}
        {exercise.isCustom ? ' · Custom' : ''}
      </p>
      {exercise.notes && <p className="ex-notes" style={{ margin: 0 }}>“{exercise.notes}”</p>}

      <button type="button" className="card card-link spread" style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }} onClick={() => setProgression(true)}>
        <span>
          <span className="small muted" style={{ display: 'block' }}>
            Progression target
          </span>
          <strong className="num">
            {exercise.repMin ?? settings.repMin}–{exercise.repMax ?? settings.repMax} reps · +{formatWeight(exercise.weightStep ?? settings.weightStep)} kg
          </strong>
        </span>
        <Icon name="edit" size={18} />
      </button>

      {sessions.length === 0 ? (
        <EmptyState icon="chart" title="No history yet">
          Log this exercise in a workout and your sets, records and charts will appear here.
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="rec-h">
            <div className="section-title">
              <h2 id="rec-h">Personal records</h2>
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
            <section className="stack" aria-label="Charts">
              <LineChartCard title="Weight over time (top set)" unit="kg" data={series.map((p) => ({ label: p.label, value: p.weight }))} summary={`From ${series[0].weight} kg to ${series.at(-1)!.weight} kg over ${series.length} sessions.`} />
              <LineChartCard title="Estimated 1RM" unit="kg" data={series.map((p) => ({ label: p.label, value: p.e1rm }))} summary={`From ${series[0].e1rm} kg to ${series.at(-1)!.e1rm} kg.`} />
              <BarChartCard title="Volume per session" unit="kg" data={series.map((p) => ({ label: p.label, value: p.volume }))} summary={`Latest session ${series.at(-1)!.volume} kg.`} />
            </section>
          )}

          <section aria-labelledby="hist-h">
            <div className="section-title">
              <h2 id="hist-h">History</h2>
              <span className="small faint">{plural(sessions.length, 'session')}</span>
            </div>
            <ul className="list" style={{ marginTop: 8 }}>
              {sessions.map((s) => (
                <li key={s.workoutExercise.id}>
                  <Link to={`/history/${s.workout.id}`} className="card card-link">
                    <div className="spread">
                      <strong>{formatDayMonth(s.workout.date)}</strong>
                      <span className="small muted num">
                        {formatNumber(totalVolume(s.sets))} kg · e1RM {formatWeight(bestE1RM(s.sets))}
                      </span>
                    </div>
                    <ol className="meta" style={{ listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
                      {s.sets.map((x) => (
                        <li key={x.id} className={x.isWarmup ? 'faint' : ''}>
                          {x.isWarmup ? 'W ' : ''}
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
            Est. 1RM = weight × (1 + reps / 30) (Epley). It is an estimate, not a tested max.
          </p>
        </>
      )}

      {exercise.isCustom && (
        <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" /> Delete exercise
        </button>
      )}

      {editing && (
        <Sheet title="Edit exercise" onClose={() => setEditing(false)} focusFirstInput>
          <ExerciseForm exercise={exercise} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
        </Sheet>
      )}
      {progression && <ProgressionSheet exerciseId={exercise.id} initial={{ repMin: exercise.repMin ?? settings.repMin, repMax: exercise.repMax ?? settings.repMax, weightStep: exercise.weightStep ?? settings.weightStep }} onClose={() => setProgression(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete exercise?"
          message={sessions.length ? 'This exercise has history. It will be hidden from the exercise list, but past workouts keep it.' : 'This exercise will be deleted.'}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteExercise(exercise.id);
            toast({ message: `${exercise.name} deleted` });
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

  async function save() {
    const min = parseInt(repMin, 10), max = parseInt(repMax, 10), st = parseFloat(step.replace(',', '.'));
    if (!(min > 0 && max > 0 && st > 0)) return setError('Please enter positive numbers.');
    try {
      await updateExercise(exerciseId, { repMin: min, repMax: max, weightStep: st });
      onClose();
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : 'Could not save.');
    }
  }

  return (
    <Sheet title="Progression target" onClose={onClose} footer={<button type="button" className="btn btn-primary" onClick={save}>Save</button>}>
      <p className="small muted">
        When every working set reaches the top of the rep range, Setlog suggests adding one weight step next time. It is only a guideline – you always choose the weight.
      </p>
      <div className="row" style={{ gap: 10 }}>
        <label className="field grow">
          <span>Min reps</span>
          <input className="input" inputMode="numeric" value={repMin} onChange={(e) => setMin(e.target.value)} />
        </label>
        <label className="field grow">
          <span>Max reps</span>
          <input className="input" inputMode="numeric" value={repMax} onChange={(e) => setMax(e.target.value)} />
        </label>
        <label className="field grow">
          <span>Step (kg)</span>
          <input className="input" inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} />
        </label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Sheet>
  );
}
