import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { isWorkingSet, totalVolume } from '../../utils/calc';
import { formatDuration, formatNumber } from '../../utils/format';
import type { WorkoutData } from './useWorkoutData';

interface Props {
  data: WorkoutData;
  onFinish: (keepFilled: boolean) => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function FinishSheet({ data, onFinish, onDiscard, onClose }: Props) {
  const all = data.items.flatMap((i) => i.sets);
  const done = all.filter(isWorkingSet).length;
  const filledOpen = all.filter((s) => !s.completed && (s.reps ?? 0) > 0).length;
  const empty = all.filter((s) => !s.completed).length - filledOpen;
  const [keepFilled, setKeep] = useState(false);
  const duration = (Date.now() - Date.parse(data.workout.startTime)) / 1000;
  const nothing = done === 0 && !(keepFilled && filledOpen > 0);

  return (
    <Sheet
      title="Finish workout?"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Keep training
          </button>
          <button type="button" className="btn btn-primary" onClick={() => (nothing ? onDiscard() : onFinish(keepFilled))}>
            {nothing ? 'Discard workout' : 'Finish & save'}
          </button>
        </>
      }
    >
      <dl className="stat-grid">
        <div className="stat">
          <dt>Time</dt>
          <dd>{formatDuration(duration)}</dd>
        </div>
        <div className="stat">
          <dt>Sets</dt>
          <dd>{done}</dd>
        </div>
        <div className="stat">
          <dt>Volume</dt>
          <dd>
            {formatNumber(totalVolume(all))} <small>kg</small>
          </dd>
        </div>
      </dl>
      {filledOpen > 0 && (
        <div className="switch card" style={{ padding: '8px 14px' }}>
          <label htmlFor="keep-filled">
            <strong>Save {filledOpen} unchecked {filledOpen === 1 ? 'set' : 'sets'} as done</strong>
            <div className="small muted">Otherwise they are discarded.</div>
          </label>
          <input id="keep-filled" type="checkbox" checked={keepFilled} onChange={(e) => setKeep(e.target.checked)} />
        </div>
      )}
      {empty > 0 && <p className="small muted">{empty} empty {empty === 1 ? 'set' : 'sets'} will be removed.</p>}
      {nothing && <p className="notice warn">No completed sets yet – finishing now will discard this workout.</p>}
    </Sheet>
  );
}
