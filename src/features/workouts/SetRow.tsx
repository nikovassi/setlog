import { memo, useEffect, useRef } from 'react';
import { Icon } from '../../components/Icon';
import { useI18n } from '../../i18n/react';
import type { WorkoutSet } from '../../types';
import { NumInput } from './NumInput';

type Values = Pick<WorkoutSet, 'weight' | 'reps'>;

interface Props {
  set: WorkoutSet;
  workingIndex: number | null;
  exerciseName: string;
  isPR?: boolean;
  onChange: (id: string, patch: Partial<WorkoutSet>) => void;
  /** `values` are the latest typed values, which may not have reached the database yet. */
  onToggle: (set: WorkoutSet, values: Values) => void;
  onOpenDetails: (set: WorkoutSet) => void;
}

/** One set: [#] [kg] [reps] [RPE] [✓]. Pre-filled values mean the common case is a single tap on ✓. */
export const SetRow = memo(function SetRow({ set, workingIndex, exerciseName, isPR, onChange, onToggle, onOpenDetails }: Props) {
  const { t } = useI18n();
  const repsRef = useRef<HTMLInputElement>(null);
  const latest = useRef<Values>({ weight: set.weight, reps: set.reps });
  useEffect(() => {
    latest.current = { weight: set.weight, reps: set.reps };
  }, [set.weight, set.reps]);

  const commit = (patch: Partial<Values>) => {
    latest.current = { ...latest.current, ...patch };
    onChange(set.id, patch);
  };

  const label = set.isWarmup ? t('set.warmupShort') : String(workingIndex ?? set.setNumber);
  const name = t('set.name', { exercise: exerciseName, label: set.isWarmup ? t('set.warmupWord') : label });
  return (
    <li className={`set-row${set.completed ? ' done' : ''}${set.isWarmup ? ' warmup' : ''}`}>
      <button type="button" className="set-num" onClick={() => onOpenDetails(set)} aria-label={t('card.options', { name })}>
        {label}
      </button>
      <NumInput label={t('set.weightAria', { name })} decimal value={set.weight} placeholder={t('set.kgPh')} onCommit={(weight) => commit({ weight })} />
      <NumInput ref={repsRef} label={t('set.repsAria', { name })} value={set.reps} placeholder={t('set.repsPh')} max={999} onCommit={(reps) => commit({ reps })} />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ padding: 0, minHeight: 44 }}
        onClick={() => onOpenDetails(set)}
        aria-label={set.rpe ? t('set.rpeAria', { name, rpe: set.rpe }) : t('set.rpeNotSet', { name })}
      >
        <span className={set.rpe ? '' : 'faint'}>{set.rpe ? `@${set.rpe}` : t('set.rpe')}</span>
      </button>
      <button
        type="button"
        className="check"
        aria-pressed={set.completed}
        aria-label={set.completed ? t('set.completedAria', { name }) : t('set.completeAria', { name })}
        onClick={() => {
          if (!set.completed && !latest.current.reps) {
            repsRef.current?.focus();
            return;
          }
          onToggle(set, latest.current);
        }}
      >
        <Icon name="check" size={24} />
      </button>
      {(set.notes || isPR) && (
        <div className="set-meta">
          {isPR && <span className="pr-tag">{t('set.pr')}</span>}
          {set.notes && <span>“{set.notes}”</span>}
        </div>
      )}
    </li>
  );
});
