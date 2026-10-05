import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db';
import { MUSCLE_GROUPS } from '../../db/seed';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import type { Exercise } from '../../types';
import { ExerciseForm } from './ExerciseForm';

interface Props {
  title?: string;
  multi?: boolean;
  onPick: (ids: string[]) => void;
  onClose: () => void;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Search-first exercise list. Recently used exercises float to the top. */
export function ExercisePicker({ title = 'Add exercise', multi, onPick, onClose }: Props) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const data = useLiveQuery(async () => {
    const [exercises, recentSets] = await Promise.all([db.exercises.toArray(), db.sets.orderBy('timestamp').reverse().limit(400).toArray()]);
    const recency = new Map<string, number>();
    recentSets.forEach((s, i) => !recency.has(s.exerciseId) && recency.set(s.exerciseId, i));
    return { exercises: exercises.filter((e) => !e.archived), recency };
  }, []);

  const list = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.exercises
      .filter((e) => (!muscle || e.muscleGroup === muscle) && (!needle || e.name.toLowerCase().includes(needle) || e.equipment.toLowerCase().includes(needle)))
      .sort((a, b) => (data.recency.get(a.id) ?? 1e9) - (data.recency.get(b.id) ?? 1e9) || a.name.localeCompare(b.name));
  }, [data, q, muscle]);

  const muscles = useMemo(() => MUSCLE_GROUPS.filter((m) => data?.exercises.some((e) => e.muscleGroup === m)), [data]);

  function choose(ex: Exercise) {
    if (!multi) return onPick([ex.id]);
    setSelected((s) => (s.includes(ex.id) ? s.filter((x) => x !== ex.id) : [...s, ex.id]));
  }

  if (creating) {
    return (
      <Sheet title="New exercise" onClose={onClose} focusFirstInput>
        <ExerciseForm
          initialName={q}
          onCancel={() => setCreating(false)}
          onSaved={(ex) => {
            setCreating(false);
            if (ex) {
              if (multi) setSelected((s) => [...s, ex.id]);
              else onPick([ex.id]);
            }
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      title={title}
      onClose={onClose}
      focusFirstInput
      footer={
        multi ? (
          <button type="button" className="btn btn-primary" disabled={!selected.length} onClick={() => onPick(selected)}>
            Add {selected.length || ''} {selected.length === 1 ? 'exercise' : 'exercises'}
          </button>
        ) : undefined
      }
    >
      <div className="row" style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, paddingBottom: 4 }}>
        <label className="grow" style={{ position: 'relative' }}>
          <span className="sr-only">Search exercises</span>
          <input className="input" type="search" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 40 }} enterKeyHint="search" />
          <span style={{ position: 'absolute', left: 12, top: 13, color: 'var(--faint)' }}>
            <Icon name="search" size={20} />
          </span>
        </label>
      </div>
      <div className="chips" role="group" aria-label="Filter by muscle group">
        <button type="button" className="chip" aria-pressed={muscle === null} onClick={() => setMuscle(null)}>
          All
        </button>
        {muscles.map((m) => (
          <button key={m} type="button" className="chip" aria-pressed={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
            {m}
          </button>
        ))}
      </div>
      <ul className="list" style={{ gap: 2 }} aria-label="Exercises">
        {list.map((ex) => (
          <li key={ex.id}>
            <button type="button" className="pick-item" aria-pressed={multi ? selected.includes(ex.id) : undefined} onClick={() => choose(ex)}>
              <span className="avatar" aria-hidden>
                {multi && selected.includes(ex.id) ? <Icon name="check" size={20} /> : initials(ex.name)}
              </span>
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 650 }}>{ex.name}</span>
                <span className="small muted">
                  {ex.muscleGroup} · {ex.equipment}
                  {ex.isCustom ? ' · Custom' : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {data && list.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 12 }}>No exercise matches “{q}”.</p>}
      <button type="button" className="btn btn-block" onClick={() => setCreating(true)}>
        <Icon name="plus" /> Create {q.trim() ? `“${q.trim()}”` : 'custom exercise'}
      </button>
    </Sheet>
  );
}
