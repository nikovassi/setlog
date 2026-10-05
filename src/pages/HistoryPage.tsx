import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useI18n } from '../i18n/react';
import { loadDataset, summarize } from '../services/stats';
import { formatDuration, formatNumber } from '../utils/format';

export default function HistoryPage() {
  const { t, pl, monthName } = useI18n();
  const groups = useLiveQuery(async () => {
    const ds = await loadDataset();
    const byMonth = new Map<string, ReturnType<typeof summarize>[]>();
    for (const w of ds.workouts) {
      const k = w.date.slice(0, 7);
      byMonth.set(k, [...(byMonth.get(k) ?? []), summarize(ds, w)]);
    }
    return [...byMonth.entries()];
  }, []);

  return (
    <main className="page" id="main">
      <PageHeader title={t('history.title')} />
      {groups && groups.length === 0 && (
        <EmptyState
          icon="history"
          title={t('home.emptyTitle')}
          action={
            <Link to="/workout" className="btn btn-primary">
              {t('home.start')}
            </Link>
          }
        >
          {t('history.emptyText')}
        </EmptyState>
      )}
      {groups?.map(([month, items]) => {
        const title = `${monthName(Number(month.slice(5)), 'long')} ${month.slice(0, 4)}`;
        return (
          <section key={month} aria-label={title}>
            <div className="section-title">
              <h2>{title}</h2>
              <span className="small faint">{pl(items.length, 'workout')}</span>
            </div>
            <ul className="list" style={{ marginTop: 8 }}>
              {items.map(({ workout, exerciseCount, setCount, volume }) => (
                <li key={workout.id}>
                  <Link to={`/history/${workout.id}`} className="card card-link row" style={{ gap: 12 }}>
                    <div className="date-badge" aria-hidden>
                      <b>{workout.date.slice(8)}</b>
                      <span>{monthName(Number(workout.date.slice(5, 7)))}</span>
                    </div>
                    <div className="grow">
                      <h3 className="truncate">
                        <span className="sr-only">{workout.date} </span>
                        {workout.name}
                      </h3>
                      <div className="meta">
                        <span>{formatDuration(workout.duration)}</span>
                        <span>{pl(exerciseCount, 'exercise')}</span>
                        <span>{pl(setCount, 'set')}</span>
                        <span>
                          {formatNumber(volume)} {t('common.kg')}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
