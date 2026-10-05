import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { loadDataset, summarize } from '../services/stats';
import { plural } from '../utils/plural';
import { formatDuration, formatNumber } from '../utils/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HistoryPage() {
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
      <PageHeader title="History" />
      {groups && groups.length === 0 && (
        <EmptyState icon="history" title="No workouts yet" action={<Link to="/workout" className="btn btn-primary">Start workout</Link>}>
          Finished workouts appear here, newest first.
        </EmptyState>
      )}
      {groups?.map(([month, items]) => (
        <section key={month} aria-label={`${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`}>
          <div className="section-title">
            <h2>
              {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
            </h2>
            <span className="small faint">{plural(items.length, 'workout')}</span>
          </div>
          <ul className="list" style={{ marginTop: 8 }}>
            {items.map(({ workout, exerciseCount, setCount, volume }) => (
              <li key={workout.id}>
                <Link to={`/history/${workout.id}`} className="card card-link row" style={{ gap: 12 }}>
                  <div className="date-badge" aria-hidden>
                    <b>{workout.date.slice(8)}</b>
                    <span>{SHORT[Number(workout.date.slice(5, 7)) - 1]}</span>
                  </div>
                  <div className="grow">
                    <h3 className="truncate">
                      <span className="sr-only">{workout.date} </span>
                      {workout.name}
                    </h3>
                    <div className="meta">
                      <span>{formatDuration(workout.duration)}</span>
                      <span>{plural(exerciseCount, 'exercise')}</span>
                      <span>{plural(setCount, 'set')}</span>
                      <span>{formatNumber(volume)} kg</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
