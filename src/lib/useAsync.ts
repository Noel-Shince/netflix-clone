/**
 * Runs an async loader on mount and tracks its loading / error / success
 * state, with a `retry` for error UIs.
 *
 * `load` must be stable (defined at module level or memoised); a new function
 * every render would refetch every render. Results that arrive after unmount
 * are dropped.
 */
import { useCallback, useEffect, useState } from 'react';

export type AsyncResult<T> =
  { status: 'loading' } | { status: 'error'; error: Error } | { status: 'success'; data: T };

export function useAsync<T>(load: () => Promise<T>) {
  const [result, setResult] = useState<AsyncResult<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active) setResult({ status: 'success', data });
      },
      (error: unknown) => {
        if (!active) return;
        const err = error instanceof Error ? error : new Error(String(error));
        // Surfaces the cause (e.g. missing token, HTTP status) for developers;
        // the UI shows a generic message.
        console.error(err);
        setResult({ status: 'error', error: err });
      },
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setResult({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { result, retry };
}
