import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChartCard, LineChartCard } from '../components/Charts';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { exerciseSeries, loadDataset, mostTrained, overview, prTimeline, weeklyFrequency, weeklyVolume } from '../services/stats';
import { formatDayMonth, formatNumber, setLabel } from '../utils/format';
import { prLabel } from '../utils/pr';
import { useI18n } from '../i18n/react';

export default function ProgressPage() {
  const [picked, setPicked] = useState<string | null>(null);
  const { t, pl, exerciseName } = useI18n();
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
      <PageHeader
        title={t('progress.title')}
        actions={
          <Link to="/exercises" className="btn btn-sm">
            {t('exl.title')}
          </Link>
        }
      />
      {stats.totalWorkouts === 0 ? (
        <EmptyState
          icon="chart"
          title={t('progress.emptyTitle')}
          action={
            <Link to="/workout" className="btn btn-primary">
              {t('home.start')}
            </Link>
          }
        >
          {t('progress.emptyText')}
        </EmptyState>
      ) : (
        <>
          <dl className="stat-grid">
            <div className="stat">
              <dt>{t('stat.total')}</dt>
              <dd>{stats.totalWorkouts}</dd>
            </div>
            <div className="stat">
              <dt>{t('stat.thisWeek')}</dt>
              <dd>{stats.thisWeek}</dd>
            </div>
            <div className="stat">
              <dt>{t('stat.thisMonth')}</dt>
              <dd>{stats.thisMonth}</dd>
            </div>
          </dl>
          <div className="stat">
            <dt>{t('stat.totalVolume')}</dt>
            <dd>
              {formatNumber(stats.totalVolume)} <small>{t('common.kg')}</small>
            </dd>
          </div>

          <BarChartCard title={t('chart.volumeWeek')} unit={t('common.kg')} data={volume} summary={t('chart.weekSummary', { v: `${volume.at(-1)?.value ?? 0} ${t('common.kg')}` })} />
          <BarChartCard title={t('chart.freqWeek')} data={freq} summary={t('chart.weekSummary', { v: pl(freq.at(-1)?.value ?? 0, 'workout') })} />

          {top.length > 0 && (
            <section className="stack" aria-labelledby="ex-prog-h">
              <div className="section-title">
                <h2 id="ex-prog-h">{t('progress.exProg')}</h2>
              </div>
              <div className="chips" role="group" aria-label={t('progress.choose')}>
                {top.map(({ exercise }) => (
                  <button key={exercise.id} type="button" className="chip" aria-pressed={exercise.id === exerciseId} onClick={() => setPicked(exercise.id)}>
                    {exerciseName(exercise)}
                  </button>
                ))}
              </div>
              {series.length >= 2 ? (
                <>
                  <LineChartCard title={t('chart.topSet')} unit={t('common.kg')} data={series.map((p) => ({ label: p.label, value: p.weight }))} summary={t('chart.range', { a: series[0].weight, b: series.at(-1)!.weight })} />
                  <LineChartCard title={t('chart.e1rmEpley')} unit={t('common.kg')} data={series.map((p) => ({ label: p.label, value: p.e1rm }))} summary={t('chart.range', { a: series[0].e1rm, b: series.at(-1)!.e1rm })} />
                </>
              ) : (
                <p className="small muted">{t('progress.needTwo')}</p>
              )}
            </section>
          )}

          <section aria-labelledby="most-h">
            <div className="section-title">
              <h2 id="most-h">{t('progress.most')}</h2>
            </div>
            <ul className="card divider-list" style={{ padding: '0 14px', marginTop: 8 }}>
              {top.map(({ exercise, sessions }) => (
                <li key={exercise.id}>
                  <Link to={`/exercise/${exercise.id}`} className="spread" style={{ minHeight: 48, textDecoration: 'none' }}>
                    <span>{exerciseName(exercise)}</span>
                    <span className="muted small">{pl(sessions, 'session')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="pr-h">
            <div className="section-title">
              <h2 id="pr-h">{t('progress.prs')}</h2>
            </div>
            {prs.length === 0 ? (
              <p className="small muted" style={{ marginTop: 8 }}>
                {t('progress.noPrs')}
              </p>
            ) : (
              <ul className="card divider-list" style={{ padding: '0 14px', marginTop: 8 }}>
                {prs.map((p) => (
                  <li key={p.set.id} className="spread" style={{ minHeight: 56, padding: '6px 0' }}>
                    <span className="grow">
                      <strong style={{ display: 'block' }}>{exerciseName(p.exercise)}</strong>
                      <span className="small muted">{p.kinds.map(prLabel).join(' · ')}</span>
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
