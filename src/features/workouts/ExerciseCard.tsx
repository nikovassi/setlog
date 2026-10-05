import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import type { Settings, WorkoutSet } from '../../types';
import { useI18n } from '../../i18n/react';
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
  const { t, exerciseName, muscleName, equipmentName } = useI18n();
  const [menu, setMenu] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.we.notes);
  const [detailSet, setDetailSet] = useState<WorkoutSet | null>(null);
  const { exercise, sets, last, label } = item;
  const name = exerciseName(exercise);

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
            {label && <span className="ss-badge" aria-label={t('card.supersetLabel', { label })}>{label}</span>}
            {exercise ? (
              <Link className="ex-name" to={`/exercise/${exercise.id}`}>
                {name}
              </Link>
            ) : (
              <span className="ex-name">{name}</span>
            )}
          </h2>
          <div className="small muted">
            {muscleName(exercise?.muscleGroup)}
            {exercise?.equipment ? ` · ${equipmentName(exercise.equipment)}` : ''}
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label={t('card.options', { name })} onClick={() => setMenu(true)}>
          <Icon name="more" />
        </button>
      </div>

      {item.we.notes && !editingNotes && <p className="ex-notes">“{item.we.notes}”</p>}

      {showLast && (
        <div className="last-time" aria-label={t('card.lastTimeFor', { name })}>
          {last ? (
            <>
              <span className="muted">{t('card.lastTime', { date: formatDayMonth(last.workout.date) })}</span>
              <ol>
                {last.sets.map((s) => (
                  <li key={s.id} className={s.isWarmup ? 'faint' : ''}>
                    {s.isWarmup ? `${t('set.warmupShort')} ` : ''}
                    {setLabel(s.weight, s.reps)}
                    {s.rpe ? ` @${s.rpe}` : ''}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <span className="muted">{t('card.firstTime')}</span>
          )}
        </div>
      )}

      {suggestion.kind !== 'none' && pending.length > 0 && (
        <div className="suggest">
          <span>
            {t('card.suggested')}{' '}
            <strong className="num">
              {setLabel(suggestion.weight, suggestion.reps)}
            </strong>
            {suggestion.kind === 'increase' && <span className="muted"> (+{formatWeight(suggestion.delta)} {t('common.kg')})</span>}
          </span>
          {!suggestionApplied && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => actions.onApplySuggestion(item, suggestion.weight, suggestion.reps)}>
              {t('card.use')}
            </button>
          )}
        </div>
      )}

      <div className="sets-head" aria-hidden>
        <span>{t('card.set')}</span>
        <span>{t('common.kg')}</span>
        <span>{t('card.reps')}</span>
        <span />
        <span />
      </div>
      <ol className="divider-list" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label={t('card.setsOf', { name })}>
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
          <Icon name="plus" size={18} /> {t('card.addSet')}
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
                <Icon name="note" /> {item.we.notes ? t('card.editNote') : t('card.addNote')}
              </button>
            </li>
            {index < count - 1 && (
              <li>
                <button type="button" className="menu-item" onClick={() => (setMenu(false), actions.onSuperset(item))}>
                  <Icon name="link" /> {label && !item.endsSuperset ? t('card.unlink') : t('card.superset')}
                </button>
              </li>
            )}
            {index > 0 && (
              <li>
                <button type="button" className="menu-item" onClick={() => (setMenu(false), actions.onMove(item, -1))}>
                  <Icon name="up" /> {t('card.moveUp')}
                </button>
              </li>
            )}
            {index < count - 1 && (
              <li>
                <button type="button" className="menu-item" onClick={() => (setMenu(false), actions.onMove(item, 1))}>
                  <Icon name="down" /> {t('card.moveDown')}
                </button>
              </li>
            )}
            <li>
              <button type="button" className="menu-item danger" onClick={() => (setMenu(false), actions.onRemove(item))}>
                <Icon name="trash" /> {t('card.remove')}
              </button>
            </li>
          </ul>
        </Sheet>
      )}

      {editingNotes && (
        <Sheet
          title={t('card.noteTitle')}
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
              {t('card.saveNote')}
            </button>
          }
        >
          <label className="field">
            <span>{t('card.noteFor', { name })}</span>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('card.notePh')} />
          </label>
        </Sheet>
      )}
    </article>
  );
});
