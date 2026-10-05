import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/**
 * Subscribes to a Dexie query and re-renders whenever the underlying data changes.
 * Returns `undefined` while loading.
 */
export function useLiveQuery<T>(query: () => Promise<T> | T, deps: unknown[]): T | undefined {
  const [state, setState] = useState<{ value: T | undefined; deps: unknown[] }>({ value: undefined, deps });
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (value) => setState({ value, deps }),
      error: (e) => setError(e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (error) throw error; // surfaced by the ErrorBoundary as a friendly message
  // Avoid showing stale data from a previous key (e.g. navigating between workouts).
  const same = state.deps.length === deps.length && state.deps.every((d, i) => Object.is(d, deps[i]));
  return same ? state.value : undefined;
}
