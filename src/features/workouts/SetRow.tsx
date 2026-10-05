import { memo, useEffect, useRef } from 'react';
import { Icon } from '../../components/Icon';
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
  const repsRef = useRef<HTMLInputElement>(null);
  const latest = useRef<Values>({ weight: set.weight, reps: set.reps });
  useEffect(() => {
    latest.current = { weight: set.weight, reps: set.reps };
  }, [set.weight, set.reps]);

  const commit = (patch: Partial<Values>) => {
    latest.current = { ...latest.current, ...patch };
    onChange(set.id, patch);
  };

  const label = set.isWarmup ? 'W' : String(workingIndex ?? set.setNumber);
  const name = `${exerciseName} set ${set.isWarmup ? 'warm-up' : label}`;
  return (
    <li className={`set-row${set.completed ? ' done' : ''}${set.isWarmup ? ' warmup' : ''}`}>
      <button type="button" className="set-num" onClick={() => onOpenDetails(set)} aria-label={`${name} options`}>
        {label}
      </button>
      <NumInput label={`${name} weight in kg`} decimal value={set.weight} placeholder="kg" onCommit={(weight) => commit({ weight })} />
      <NumInput ref={repsRef} label={`${name} reps`} value={set.reps} placeholder="reps" max={999} onCommit={(reps) => commit({ reps })} />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ padding: 0, minHeight: 44 }}
        onClick={() => onOpenDetails(set)}
        aria-label={`${name} RPE${set.rpe ? ` ${set.rpe}` : ', not set'}`}
      >
        <span className={set.rpe ? '' : 'faint'}>{set.rpe ? `@${set.rpe}` : 'RPE'}</span>
      </button>
      <button
        type="button"
        className="check"
        aria-pressed={set.completed}
        aria-label={set.completed ? `${name} completed, tap to undo` : `Complete ${name}`}
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
          {isPR && <span className="pr-tag">★ PR</span>}
          {set.notes && <span>“{set.notes}”</span>}
        </div>
      )}
    </li>
  );
});
