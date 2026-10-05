import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { db } from '../db';
import { ExerciseForm } from '../features/exercises/ExerciseForm';
import { initials } from '../features/exercises/ExercisePicker';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useI18n } from '../i18n/react';

export default function ExercisesPage() {
  const navigate = useNavigate();
  const { t, exerciseName, muscleName, equipmentName, lang } = useI18n();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').filter((e) => !e.archived).toArray(), []);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (exercises ?? [])
      .filter((e) => [e.name, exerciseName(e)].some((s) => s.toLowerCase().includes(needle)))
      .sort((a, b) => exerciseName(a).localeCompare(exerciseName(b), lang));
  }, [exercises, q, exerciseName, lang]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof list>();
    for (const e of list) m.set(e.muscleGroup, [...(m.get(e.muscleGroup) ?? []), e]);
    return [...m.entries()].sort((a, b) => muscleName(a[0]).localeCompare(muscleName(b[0]), lang));
  }, [list, muscleName, lang]);

  return (
    <main className="page" id="main">
      <PageHeader
        title={t('exl.title')}
        back
        actions={
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> {t('common.new')}
          </button>
        }
      />
      <label>
        <span className="sr-only">{t('picker.search')}</span>
        <input className="input" type="search" placeholder={t('exl.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {exercises && list.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>{t('picker.noMatch', { q })}</p>}
      {groups.map(([group, items]) => (
        <section key={group} aria-label={muscleName(group)}>
          <div className="section-title">
            <h2>{muscleName(group)}</h2>
          </div>
          <ul className="list" style={{ gap: 0 }}>
            {items.map((e) => (
              <li key={e.id}>
                <Link to={`/exercise/${e.id}`} className="pick-item" style={{ textDecoration: 'none' }}>
                  <span className="avatar" aria-hidden>
                    {initials(exerciseName(e))}
                  </span>
                  <span className="grow">
                    <span style={{ display: 'block', fontWeight: 650 }}>{exerciseName(e)}</span>
                    <span className="small muted">
                      {equipmentName(e.equipment)}
                      {e.isCustom ? ` · ${t('common.custom')}` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {creating && (
        <Sheet title={t('picker.newExercise')} onClose={() => setCreating(false)} focusFirstInput>
          <ExerciseForm initialName={q} onCancel={() => setCreating(false)} onSaved={(ex) => (setCreating(false), ex && navigate(`/exercise/${ex.id}`))} />
        </Sheet>
      )}
    </main>
  );
}
