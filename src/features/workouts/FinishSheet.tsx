import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { isWorkingSet, totalVolume } from '../../utils/calc';
import { formatDuration, formatNumber } from '../../utils/format';
import { useI18n } from '../../i18n/react';
import type { WorkoutData } from './useWorkoutData';

interface Props {
  data: WorkoutData;
  onFinish: (keepFilled: boolean) => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function FinishSheet({ data, onFinish, onDiscard, onClose }: Props) {
  const { t, pw } = useI18n();
  const all = data.items.flatMap((i) => i.sets);
  const done = all.filter(isWorkingSet).length;
  const filledOpen = all.filter((s) => !s.completed && (s.reps ?? 0) > 0).length;
  const empty = all.filter((s) => !s.completed).length - filledOpen;
  const [keepFilled, setKeep] = useState(false);
  const duration = (Date.now() - Date.parse(data.workout.startTime)) / 1000;
  const nothing = done === 0 && !(keepFilled && filledOpen > 0);

  return (
    <Sheet
      title={t('finish.title')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {t('finish.keep')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => (nothing ? onDiscard() : onFinish(keepFilled))}>
            {nothing ? t('finish.discard') : t('finish.save')}
          </button>
        </>
      }
    >
      <dl className="stat-grid">
        <div className="stat">
          <dt>{t('stat.time')}</dt>
          <dd>{formatDuration(duration)}</dd>
        </div>
        <div className="stat">
          <dt>{t('stat.sets')}</dt>
          <dd>{done}</dd>
        </div>
        <div className="stat">
          <dt>{t('stat.volume')}</dt>
          <dd>
            {formatNumber(totalVolume(all))} <small>{t('common.kg')}</small>
          </dd>
        </div>
      </dl>
      {filledOpen > 0 && (
        <div className="switch card" style={{ padding: '8px 14px' }}>
          <label htmlFor="keep-filled">
            <strong>{t('finish.keepFilled', { n: filledOpen, word: pw(filledOpen, 'set') })}</strong>
            <div className="small muted">{t('finish.keepFilledHint')}</div>
          </label>
          <input id="keep-filled" type="checkbox" checked={keepFilled} onChange={(e) => setKeep(e.target.checked)} />
        </div>
      )}
      {empty > 0 && <p className="small muted">{t('finish.empty', { n: empty, word: pw(empty, 'set') })}</p>}
      {nothing && <p className="notice warn">{t('finish.nothing')}</p>}
    </Sheet>
  );
}
