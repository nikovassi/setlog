import { useMemo, useState } from 'react';
import { useToast } from '../../hooks/toast';
import { useRestTimer } from '../../hooks/restTimer';
import { useSettings } from '../../hooks/useSettings';
import * as W from '../../services/workouts';
import type { WorkoutSet } from '../../types';
import { formatWeight, setLabel } from '../../utils/format';
import { PR_LABEL } from '../../utils/pr';
import { ExerciseCard, type CardActions } from './ExerciseCard';
import type { WorkoutData } from './useWorkoutData';

interface Props {
  data: WorkoutData;
  /** active: rest timer, last-time and suggestions; edit: correcting a finished workout. */
  mode: 'active' | 'edit';
  prSetIds?: Set<string>;
}

/** Shared by the live workout screen and the history editor. All writes go through services. */
export function WorkoutEditor({ data, mode, prSetIds: initialPRs }: Props) {
  const settings = useSettings();
  const toast = useToast();
  const rest = useRestTimer();
  const [sessionPRs, setSessionPRs] = useState<Set<string>>(new Set());
  const prSetIds = useMemo(() => new Set([...(initialPRs ?? []), ...sessionPRs]), [initialPRs, sessionPRs]);

  const actions = useMemo<CardActions>(() => {
    const fail = () => toast({ message: 'Could not save that change.', detail: 'Please try again.', tone: 'error' });
    return {
      onSetChange: (id, patch) => void W.updateSet(id, patch).catch(fail),
      onSetToggle: async (item, set, values) => {
        try {
          if (set.completed) {
            await W.completeSet(set.id, false);
            setSessionPRs((s) => (s.has(set.id) ? new Set([...s].filter((x) => x !== set.id)) : s));
            return;
          }
          const kinds = await W.completeSet(set.id, true, values);
          if (mode === 'active' && settings.autoRest && item.endsSuperset && !set.isWarmup) rest.start(settings.defaultRest);
          if (kinds.length && mode === 'active') {
            setSessionPRs((s) => new Set(s).add(set.id));
            toast({
              tone: 'pr',
              message: `New PR · ${item.exercise?.name ?? ''}`,
              detail: `${setLabel(values.weight ?? 0, values.reps)} · ${kinds.map((k) => PR_LABEL[k]).join(', ')}`,
            });
          }
        } catch {
          fail();
        }
      },
      onSetDelete: async (set: WorkoutSet) => {
        const removed = await W.deleteSet(set.id).catch(() => undefined);
        if (!removed) return fail();
        toast({
          message: 'Set deleted',
          detail: removed.weight || removed.reps ? setLabel(removed.weight, removed.reps) : undefined,
          action: { label: 'Undo', onClick: () => void W.restoreSet(removed) },
        });
      },
      onAddSet: (item) => void W.addSet(item.we.id).catch(fail),
      onApplySuggestion: async (item, weight, reps) => {
        const pending = item.sets.filter((s) => !s.completed && !s.isWarmup);
        await Promise.all(pending.map((s) => W.updateSet(s.id, { weight, reps }))).catch(fail);
        toast({ message: `Using ${weight ? `${formatWeight(weight)} kg × ` : ''}${reps}`, detail: 'You can still change any set.' });
      },
      onMove: (item, dir) => void W.moveExercise(item.we.id, dir).catch(fail),
      onSuperset: (item) => void W.toggleSupersetWithNext(item.we.id).catch(fail),
      onNotes: (item, notes) => void W.updateWorkoutExercise(item.we.id, { notes }).catch(fail),
      onRemove: async (item) => {
        const removed = await W.removeExerciseFromWorkout(item.we.id).catch(() => undefined);
        if (!removed) return fail();
        toast({
          message: `${item.exercise?.name ?? 'Exercise'} removed`,
          detail: removed.sets.length ? `${removed.sets.length} set${removed.sets.length > 1 ? 's' : ''}` : undefined,
          action: { label: 'Undo', onClick: () => void W.restoreExercise(removed) },
        });
      },
    };
  }, [mode, rest, settings.autoRest, settings.defaultRest, toast]);

  return (
    <div className="stack">
      {data.items.map((item, i) => (
        <ExerciseCard key={item.we.id} item={item} index={i} count={data.items.length} settings={settings} prSetIds={prSetIds} showLast={mode === 'active'} actions={actions} />
      ))}
    </div>
  );
}
