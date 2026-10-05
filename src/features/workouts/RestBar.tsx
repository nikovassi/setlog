import { useRestTimer } from '../../hooks/restTimer';
import { formatClock } from '../../utils/format';

export function RestBar({ aboveWorkoutBar }: { aboveWorkoutBar?: boolean }) {
  const { remaining, total, adjust, stop } = useRestTimer();
  if (remaining == null) return null;
  return (
    <section className={`rest-bar${aboveWorkoutBar ? ' over-bar' : ''}`} aria-label="Rest timer">
      <div className="rest-inner">
        <span className="small" style={{ fontWeight: 700, opacity: 0.7 }}>
          Rest
        </span>
        <span className="rest-time num" role="timer" aria-live="off">
          {formatClock(remaining)}
        </span>
        <button type="button" className="btn" onClick={() => adjust(-15)} aria-label="Subtract 15 seconds">
          −15
        </button>
        <button type="button" className="btn" onClick={() => adjust(15)} aria-label="Add 15 seconds">
          +15
        </button>
        <button type="button" className="btn" onClick={stop}>
          Skip
        </button>
      </div>
      <div className="rest-progress" style={{ width: `${total ? (remaining / total) * 100 : 0}%` }} />
    </section>
  );
}
