import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { db } from '../db';
import { initials } from '../features/exercises/ExercisePicker';
import { useActiveWorkout } from '../hooks/useActiveWorkout';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { loadDataset, overview, progressHighlight, summarize } from '../services/stats';
import { formatDayMonth, formatDuration, formatNumber, formatWeight } from '../utils/format';
import { useI18n } from '../i18n/react';
import { useStartWorkout } from './WorkoutPage';

export default function HomePage() {
  const navigate = useNavigate();
  const { t, pl, exerciseName, muscleName } = useI18n();
  const active = useActiveWorkout();
  const { start, busy } = useStartWorkout();
  const data = useLiveQuery(async () => {
    const [ds, routines] = await Promise.all([loadDataset(), db.routines.orderBy('updatedAt').reverse().limit(6).toArray()]);
    const recentIds: string[] = [];
    for (const s of [...ds.sets].sort((a, b) => b.timestamp.localeCompare(a.timestamp))) {
      if (!recentIds.includes(s.exerciseId)) recentIds.push(s.exerciseId);
      if (recentIds.length === 6) break;
    }
    const exMap = new Map(ds.exercises.map((e) => [e.id, e]));
    return {
      last: ds.workouts[0] && summarize(ds, ds.workouts[0]),
      stats: overview(ds),
      highlight: progressHighlight(ds),
      recent: recentIds.map((id) => exMap.get(id)).filter((e) => !!e),
      routines,
    };
  }, []);

  const go = async (routineId?: string) => {
    await start(routineId);
    navigate('/workout');
  };

  return (
    <main className="page" id="main">
      <header className="spread" style={{ minHeight: 48 }}>
        <div>
          <h1>Setlog</h1>
          <p className="small muted">{t('app.tagline')}</p>
        </div>
      </header>

      <section className="hero" aria-label={t('nav.workout')}>
        {active ? (
          <Link to="/workout" className="card card-link resume">
            <div className="spread">
              <div>
                <div className="small muted">{t('nav.inProgress')}</div>
                <h2>{active.name}</h2>
              </div>
              <span className="btn btn-primary" aria-hidden>
                {t('home.resume')}
              </span>
            </div>
          </Link>
        ) : (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => go()} disabled={busy}>
            <Icon name="plus" /> {t('home.start')}
          </button>
        )}
        {!active && data && data.routines.length > 0 && (
          <div className="chips" role="group" aria-label={t('home.fromRoutine')}>
            {data.routines.map((r) => (
              <button key={r.id} type="button" className="chip" onClick={() => go(r.id)} disabled={busy}>
                {r.name}
              </button>
            ))}
            <Link to="/routines" className="chip" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              {t('home.allRoutines')}
            </Link>
          </div>
        )}
        {!active && data && data.routines.length === 0 && (
          <Link to="/routines/new" className="small muted">
            {t('home.createRoutine')}
          </Link>
        )}
      </section>

      {data && !data.last && (
        <div className="card empty">
          <Icon name="dumbbell" size={36} />
          <h2>{t('home.emptyTitle')}</h2>
          <p>{t('home.emptyText')}</p>
        </div>
      )}

      {data?.last && (
        <>
          <section aria-labelledby="last-h">
            <div className="section-title">
              <h2 id="last-h">{t('home.lastWorkout')}</h2>
              <Link to="/history" className="small muted">
                {t('nav.history')}
              </Link>
            </div>
            <Link to={`/history/${data.last.workout.id}`} className="card card-link" style={{ marginTop: 8 }}>
              <div className="spread">
                <h3 className="truncate">{data.last.workout.name}</h3>
                <span className="small muted">{formatDayMonth(data.last.workout.date)}</span>
              </div>
              <div className="meta" style={{ marginTop: 4 }}>
                <span>{formatDuration(data.last.workout.duration)}</span>
                <span>{pl(data.last.exerciseCount, 'exercise')}</span>
                <span>{pl(data.last.setCount, 'set')}</span>
                <span>
                  {formatNumber(data.last.volume)} {t('common.kg')}
                </span>
              </div>
            </Link>
          </section>

          <section aria-labelledby="stats-h">
            <div className="section-title">
              <h2 id="stats-h">{t('home.thisWeek')}</h2>
              <Link to="/progress" className="small muted">
                {t('nav.progress')}
              </Link>
            </div>
            <dl className="stat-grid" style={{ marginTop: 8 }}>
              <div className="stat">
                <dt>{t('stat.workouts')}</dt>
                <dd>{data.stats.thisWeek}</dd>
              </div>
              <div className="stat">
                <dt>{t('stat.volume')}</dt>
                <dd>
                  {formatNumber(data.stats.weekVolume)} <small>{t('common.kg')}</small>
                </dd>
              </div>
              <div className="stat">
                <dt>
                  {t('stat.prs')} <span className="sr-only">{t('stat.thisMonthSr')}</span>
                </dt>
                <dd>
                  {data.stats.prsThisMonth} <small>{t('stat.perMonth')}</small>
                </dd>
              </div>
            </dl>
            {data.highlight && (
              <Link to={`/exercise/${data.highlight.exercise.id}`} className="card card-link" style={{ marginTop: 8 }}>
                <div className="spread">
                  <div>
                    <div className="small muted">{t('home.progress8w')}</div>
                    <h3>{exerciseName(data.highlight.exercise)}</h3>
                  </div>
                  <div className="num" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    {formatWeight(data.highlight.from)} → <span style={{ color: 'var(--accent)' }}>
                      {formatWeight(data.highlight.to)} {t('common.kg')}
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </section>

          {data.recent.length > 0 && (
            <section aria-labelledby="recent-h">
              <div className="section-title">
                <h2 id="recent-h">{t('home.recent')}</h2>
                <Link to="/exercises" className="small muted">
                  {t('common.all')}
                </Link>
              </div>
              <ul className="list" style={{ marginTop: 8, gap: 0 }}>
                {data.recent.map((e) => (
                  <li key={e.id}>
                    <Link to={`/exercise/${e.id}`} className="pick-item" style={{ textDecoration: 'none' }}>
                      <span className="avatar" aria-hidden>
                        {initials(exerciseName(e))}
                      </span>
                      <span className="grow">
                        <span style={{ display: 'block', fontWeight: 650 }}>{exerciseName(e)}</span>
                        <span className="small muted">{muscleName(e.muscleGroup)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
