import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { db } from '../db';
import { ExerciseForm } from '../features/exercises/ExerciseForm';
import { initials } from '../features/exercises/ExercisePicker';
import { useLiveQuery } from '../hooks/useLiveQuery';

export default function ExercisesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').filter((e) => !e.archived).toArray(), []);
  const list = useMemo(() => exercises?.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase())) ?? [], [exercises, q]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof list>();
    for (const e of list) m.set(e.muscleGroup, [...(m.get(e.muscleGroup) ?? []), e]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [list]);

  return (
    <main className="page" id="main">
      <PageHeader
        title="Exercises"
        back
        actions={
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> New
          </button>
        }
      />
      <label>
        <span className="sr-only">Search exercises</span>
        <input className="input" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {exercises && list.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>No exercises match “{q}”.</p>}
      {groups.map(([group, items]) => (
        <section key={group} aria-label={group}>
          <div className="section-title">
            <h2>{group}</h2>
          </div>
          <ul className="list" style={{ gap: 0 }}>
            {items.map((e) => (
              <li key={e.id}>
                <Link to={`/exercise/${e.id}`} className="pick-item" style={{ textDecoration: 'none' }}>
                  <span className="avatar" aria-hidden>
                    {initials(e.name)}
                  </span>
                  <span className="grow">
                    <span style={{ display: 'block', fontWeight: 650 }}>{e.name}</span>
                    <span className="small muted">
                      {e.equipment}
                      {e.isCustom ? ' · Custom' : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {creating && (
        <Sheet title="New exercise" onClose={() => setCreating(false)} focusFirstInput>
          <ExerciseForm initialName={q} onCancel={() => setCreating(false)} onSaved={(ex) => (setCreating(false), ex && navigate(`/exercise/${ex.id}`))} />
        </Sheet>
      )}
    </main>
  );
}
