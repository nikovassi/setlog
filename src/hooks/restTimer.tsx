import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'setlog.rest';

interface RestState {
  endsAt: number;
  total: number;
}

interface RestTimer {
  /** Seconds left, or null when no timer runs. */
  remaining: number | null;
  total: number;
  start: (seconds: number) => void;
  adjust: (delta: number) => void;
  stop: () => void;
}

const Ctx = createContext<RestTimer | null>(null);

function load(): RestState | null {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as RestState) : null;
    return s && s.endsAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

function save(s: RestState | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable – the timer still works in memory */
  }
}

/**
 * App-wide rest timer: lives above the router so it keeps running while the user
 * navigates, and is stored as an end timestamp so it survives reloads.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RestState | null>(load);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= state.endsAt) {
        if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
        setState(null);
        save(null);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state]);

  const start = useCallback((seconds: number) => {
    const s = { endsAt: Date.now() + seconds * 1000, total: seconds };
    setNow(Date.now());
    setState(s);
    save(s);
  }, []);

  const adjust = useCallback((delta: number) => {
    setState((s) => {
      if (!s) return s;
      const next = { endsAt: s.endsAt + delta * 1000, total: Math.max(1, s.total + delta) };
      if (next.endsAt <= Date.now()) {
        save(null);
        return null;
      }
      save(next);
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    setState(null);
    save(null);
  }, []);

  const value = useMemo<RestTimer>(
    () => ({ remaining: state ? Math.max(0, Math.ceil((state.endsAt - now) / 1000)) : null, total: state?.total ?? 0, start, adjust, stop }),
    [state, now, start, adjust, stop],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRestTimer(): RestTimer {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRestTimer must be used inside RestTimerProvider');
  return ctx;
}
