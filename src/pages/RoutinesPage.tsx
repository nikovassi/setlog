import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { db } from '../db';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useI18n } from '../i18n/react';

export default function RoutinesPage() {
  const { t, pl, exerciseName, lang } = useI18n();
  const routines = useLiveQuery(async () => {
    const [routines, exercises] = await Promise.all([db.routines.orderBy('name').toArray(), db.exercises.toArray()]);
    const names = new Map(exercises.map((e) => [e.id, exerciseName(e)]));
    return routines.map((r) => ({ ...r, names: r.exercises.map((e) => names.get(e.exerciseId) ?? '?') }));
  }, [lang]); // names are translated

  return (
    <main className="page" id="main">
      <PageHeader
        title={t('routines.title')}
        back
        actions={
          <Link to="/routines/new" className="btn btn-sm btn-primary">
            <Icon name="plus" size={18} /> {t('common.new')}
          </Link>
        }
      />
      {routines?.length === 0 && (
        <EmptyState
          icon="list"
          title={t('start.noRoutines')}
          action={
            <Link to="/routines/new" className="btn btn-primary">
              {t('start.createRoutine')}
            </Link>
          }
        >
          {t('routines.emptyText')}
        </EmptyState>
      )}
      <ul className="list">
        {routines?.map((r) => (
          <li key={r.id}>
            <Link to={`/routines/${r.id}`} className="card card-link">
              <h3>{r.name}</h3>
              {r.description && <p className="small muted">{r.description}</p>}
              <p className="small muted truncate" style={{ marginTop: 4 }}>
                {pl(r.exercises.length, 'exercise')} · {r.names.join(', ')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
