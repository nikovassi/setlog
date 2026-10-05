import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChartCard, LineChartCard } from '../components/Charts';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { exerciseSeries, loadDataset, mostTrained, overview, prTimeline, weeklyFrequency, weeklyVolume } from '../services/stats';
import { formatDayMonth, formatNumber, setLabel } from '../utils/format';
import { PR_LABEL } from '../utils/pr';
import { plural } from '../utils/plural';

export default function ProgressPage() {
  const [picked, setPicked] = useState<string | null>(null);
  const data = useLiveQuery(async () => {
    const ds = await loadDataset();
    const top = mostTrained(ds, 6);
    return { ds, stats: overview(ds), top, prs: prTimeline(ds).slice(0, 8), volume: weeklyVolume(ds), freq: weeklyFrequency(ds) };
  }, []);

  if (!data) return <main className="page" aria-busy="true" />;
  const { ds, stats, top, prs, volume, freq } = data;
  const exerciseId = picked ?? top[0]?.exercise.id;
  const series = exerciseId ? exerciseSeries(ds, exerciseId) : [];
  const dateOf = new Map(ds.workouts.map((w) => [w.id, w.date]));

  return (
    <main className="page" id="main">
      <PageHeader title="Progress" actions={<Link to="/exercises" className="btn btn-sm">Exercises</Link>} />
      {stats.totalWorkouts === 0 ? (
        <EmptyState icon="chart" title="No progress to show yet" action={<Link to="/workout" className="btn btn-primary">Start workout</Link>}>
          Finish a workout and your volume, frequency and records will show up here.
        </EmptyState>
      ) : (
        <>
          <dl className="stat-grid">
            <div className="stat">
              <dt>Total</dt>
              <dd>{stats.totalWorkouts}</dd>
            </div>
            <div className="stat">
              <dt>This week</dt>
              <dd>{stats.thisWeek}</dd>
            </div>
            <div className="stat">
              <dt>This month</dt>
              <dd>{stats.thisMonth}</dd>
            </div>
          </dl>
          <div className="stat">
            <dt>Total volume (working sets)</dt>
            <dd>
              {formatNumber(stats.totalVolume)} <small>kg</small>
            </dd>
          </div>

          <BarChartCard title="Volume per week" unit="kg" data={volume} summary={`Last 12 weeks. This week ${volume.at(-1)?.value ?? 0} kg.`} />
          <BarChartCard title="Workouts per week" data={freq} summary={`Last 12 weeks. This week ${freq.at(-1)?.value ?? 0} workouts.`} />

          {top.length > 0 && (
            <section className="stack" aria-labelledby="ex-prog-h">
              <div className="section-title">
                <h2 id="ex-prog-h">Exercise progression</h2>
              </div>
              <div className="chips" role="group" aria-label="Choose exercise">
                {top.map(({ exercise }) => (
                  <button key={exercise.id} type="button" className="chip" aria-pressed={exercise.id === exerciseId} onClick={() => setPicked(exercise.id)}>
                    {exercise.name}
                  </button>
                ))}
              </div>
              {series.length >= 2 ? (
                <>
                  <LineChartCard title="Top-set weight" unit="kg" data={series.map((p) => ({ label: p.label, value: p.weight }))} summary={`From ${series[0].weight} to ${series.at(-1)!.weight} kg.`} />
                  <LineChartCard title="Estimated 1RM (Epley)" unit="kg" data={series.map((p) => ({ label: p.label, value: p.e1rm }))} summary={`From ${series[0].e1rm} to ${series.at(-1)!.e1rm} kg.`} />
                </>
              ) : (
                <p className="small muted">Log this exercise in at least two workouts to see a trend.</p>
              )}
            </section>
          )}

          <section aria-labelledby="most-h">
            <div className="section-title">
              <h2 id="most-h">Most trained</h2>
            </div>
            <ul className="card divider-list" style={{ padding: '0 14px', marginTop: 8 }}>
              {top.map(({ exercise, sessions }) => (
                <li key={exercise.id}>
                  <Link to={`/exercise/${exercise.id}`} className="spread" style={{ minHeight: 48, textDecoration: 'none' }}>
                    <span>{exercise.name}</span>
                    <span className="muted small">{plural(sessions, 'session')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="pr-h">
            <div className="section-title">
              <h2 id="pr-h">Recent personal records</h2>
            </div>
            {prs.length === 0 ? (
              <p className="small muted" style={{ marginTop: 8 }}>
                Records appear once you beat a previous session.
              </p>
            ) : (
              <ul className="card divider-list" style={{ padding: '0 14px', marginTop: 8 }}>
                {prs.map((p) => (
                  <li key={p.set.id} className="spread" style={{ minHeight: 56, padding: '6px 0' }}>
                    <span className="grow">
                      <strong style={{ display: 'block' }}>{p.exercise?.name}</strong>
                      <span className="small muted">{p.kinds.map((k) => PR_LABEL[k]).join(' · ')}</span>
                    </span>
                    <span className="num" style={{ textAlign: 'right' }}>
                      <strong className="pr-tag">{setLabel(p.set.weight, p.set.reps)}</strong>
                      <span className="small faint" style={{ display: 'block' }}>
                        {formatDayMonth(dateOf.get(p.set.workoutId) ?? '')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
