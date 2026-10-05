import { useRestTimer } from '../../hooks/restTimer';
import { useI18n } from '../../i18n/react';
import { formatClock } from '../../utils/format';

export function RestBar({ aboveWorkoutBar }: { aboveWorkoutBar?: boolean }) {
  const { remaining, total, adjust, stop } = useRestTimer();
  const { t } = useI18n();
  if (remaining == null) return null;
  return (
    <section className={`rest-bar${aboveWorkoutBar ? ' over-bar' : ''}`} aria-label={t('rest.label')}>
      <div className="rest-inner">
        <span className="small rest-label" style={{ fontWeight: 700, opacity: 0.7 }}>
          {t('rest.rest')}
        </span>
        <span className="rest-time num" role="timer" aria-live="off">
          {formatClock(remaining)}
        </span>
        <button type="button" className="btn" onClick={() => adjust(-15)} aria-label={t('rest.minus')}>
          −15
        </button>
        <button type="button" className="btn" onClick={() => adjust(15)} aria-label={t('rest.plus')}>
          +15
        </button>
        <button type="button" className="btn" onClick={stop}>
          {t('rest.skip')}
        </button>
      </div>
      <div className="rest-progress" style={{ width: `${total ? (remaining / total) * 100 : 0}%` }} />
    </section>
  );
}
