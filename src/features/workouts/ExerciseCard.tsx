import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import type { Settings, WorkoutSet } from '../../types';
import { formatDayMonth, formatWeight, setLabel } from '../../utils/format';
import { suggestNext } from '../../utils/progression';
import { SetRow } from './SetRow';
import { SetSheet } from './SetSheet';
import type { WorkoutItem } from './useWorkoutData';

export interface CardActions {
  onSetChange: (id: string, patch: Partial<WorkoutSet>) => void;
  onSetToggle: (item: WorkoutItem, set: WorkoutSet, values: Pick<WorkoutSet, 'weight' | 'reps'>) => void;
  onSetDelete: (set: WorkoutSet) => void;
  onAddSet: (item: WorkoutItem) => void;
  onApplySuggestion: (item: WorkoutItem, weight: number, reps: number) => void;
  onMove: (item: WorkoutItem, dir: -1 | 1) => void;
  onSuperset: (item: WorkoutItem) => void;
  onNotes: (item: WorkoutItem, notes: string) => void;
  onRemove: (item: WorkoutItem) => void;
}

interface Props {
  item: WorkoutItem;
  index: number;
  count: number;
  settings: Settings;
  prSetIds: Set<string>;
  showLast: boolean;
  actions: CardActions;
}

export const ExerciseCard = memo(function ExerciseCard({ item, index, count, settings, prSetIds, showLast, actions }: Props) {
  const [menu, setMenu] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.we.notes);
  const [detailSet, setDetailSet] = useState<WorkoutSet | null>(null);
  const { exercise, sets, last, label } = item;
  const name = exercise?.name ?? 'Unknown exercise';

  const cfg = {
    repMin: exercise?.repMin ?? settings.repMin,
    repMax: exercise?.repMax ?? settings.repMax,
    weightStep: exercise?.weightStep ?? settings.weightStep,
  };
  const suggestion = showLast && last ? suggestNext(last.sets, cfg) : { kind: 'none' as const };
  const pending = sets.filter((s) => !s.completed && !s.isWarmup);
  const suggestionApplied = suggestion.kind !== 'none' && pending.every((s) => s.weight === suggestion.weight && s.reps === suggestion.reps);

  let working = 0;
  const workingIndex = sets.map((s) => (s.isWarmup ? null : ++working));

  return (
    <article className={`ex-card${label ? ' in-superset' : ''}`} aria-labelledby={`ex-${item.we.id}`}>
      <div className="ex-head">
        <div className="grow">
          <h2 id={`ex-${item.we.id}`} style={{ fontSize: 'inherit' }}>
            {label && <span className="ss-badge" aria-label={`Superset ${label}`}>{label}</span>}
            {exercise ? (
              <Link className="ex-name" to={`/exercise/${exercise.id}`}>
                {name}
              </Link>
            ) : (
              <span className="ex-name">{name}</span>
            )}
          </h2>
          <div className="small muted">
            {exercise?.muscleGroup}
            {exercise?.equipment ? ` · ${exercise.equipment}` : ''}
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label={`${name} options`} onClick={() => setMenu(true)}>
          <Icon name="more" />
        </button>
      </div>

      {item.we.notes && !editingNotes && <p className="ex-notes">“{item.we.notes}”</p>}

      {showLast && (
        <div className="last-time" aria-label={`Last time for ${name}`}>
          {last ? (
            <>
              <span className="muted">Last time · {formatDayMonth(last.workout.date)}</span>
              <ol>
                {last.sets.map((s) => (
                  <li key={s.id} className={s.isWarmup ? 'faint' : ''}>
                    {s.isWarmup ? 'W ' : ''}
                    {setLabel(s.weight, s.reps)}
                    {s.rpe ? ` @${s.rpe}` : ''}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <span className="muted">First time – no previous data.</span>
          )}
        </div>
      )}

      {suggestion.kind !== 'none' && pending.length > 0 && (
        <div className="suggest">
          <span>
            Suggested:{' '}
            <strong className="num">
              {suggestion.weight ? `${formatWeight(suggestion.weight)} kg × ${suggestion.reps}` : `${suggestion.reps} reps`}
            </strong>
            {suggestion.kind === 'increase' && <span className="muted"> (+{formatWeight(suggestion.delta)} kg)</span>}
          </span>
          {!suggestionApplied && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => actions.onApplySuggestion(item, suggestion.weight, suggestion.reps)}>
              Use
            </button>
          )}
        </div>
      )}

      <div className="sets-head" aria-hidden>
        <span>Set</span>
        <span>kg</span>
        <span>Reps</span>
        <span />
        <span />
      </div>
      <ol className="divider-list" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label={`${name} sets`}>
        {sets.map((s, i) => (
          <SetRow
            key={s.id}
            set={s}
            workingIndex={workingIndex[i]}
            exerciseName={name}
            isPR={prSetIds.has(s.id)}
            onChange={actions.onSetChange}
            onToggle={(set, values) => actions.onSetToggle(item, set, values)}
            onOpenDetails={setDetailSet}
          />
        ))}
      </ol>
      <div className="ex-foot">
        <button type="button" className="btn btn-sm grow" onClick={() => actions.onAddSet(item)}>
          <Icon name="plus" size={18} /> Add set
        </button>
      </div>

      {detailSet && (
        <SetSheet
          set={detailSet}
          onClose={() => setDetailSet(null)}
          onSave={(patch) => actions.onSetChange(detailSet.id, patch)}
          onDelete={() => {
            actions.onSetDelete(detailSet);
            setDetailSet(null);
          }}
        />
      )}

      {menu && (
        <Sheet title={name} onClose={() => setMenu(false)}>
          <ul className="menu-list">
            <li>
              <button type="button" className="menu-item" onClick={() => (setMenu(false), setEditingNotes(true))}>
                <Icon name="note" /> {item.we.notes ? 'Edit note' : 'Add note'}
              </button>
            </li>
            {index < count - 1 && (
              <li>
                <button type="button" className="menu-item" onClick={() => (setMenu(false), actions.onSuperset(item))}>
                  <Icon name="link" /> {label && !item.endsSuperset ? 'Unlink from next (superset)' : 'Superset with next exercise'}
                </button>
              </li>
            )}
            {index > 0 && (
              <li>
                <button type="button" className="menu-item" onClick={() => (setMenu(false), actions.onMove(item, -1))}>
                  <Icon name="up" /> Move up
                </button>
              </li>
            )}
            {index < count - 1 && (
              <li>
                <button type="button" className="menu-item" onClick={() => (setMenu(false), actions.onMove(item, 1))}>
                  <Icon name="down" /> Move down
                </button>
              </li>
            )}
            <li>
              <button type="button" className="menu-item danger" onClick={() => (setMenu(false), actions.onRemove(item))}>
                <Icon name="trash" /> Remove exercise
              </button>
            </li>
          </ul>
        </Sheet>
      )}

      {editingNotes && (
        <Sheet
          title="Exercise note"
          focusFirstInput
          onClose={() => setEditingNotes(false)}
          footer={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                actions.onNotes(item, notes.trim());
                setEditingNotes(false);
              }}
            >
              Save note
            </button>
          }
        >
          <label className="field">
            <span>Note for {name}</span>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Increase weight next time…" />
          </label>
        </Sheet>
      )}
    </article>
  );
});
