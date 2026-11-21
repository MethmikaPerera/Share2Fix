'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api';

interface State<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

/** Small data-fetching hook: re-runs when `deps` change, cancels stale requests, exposes reload(). */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ loading: true });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fnRef
      .current(ac.signal)
      .then((data) => !ac.signal.aborted && setState({ data, loading: false }))
      .catch((e) => {
        if (ac.signal.aborted || (e as Error).name === 'AbortError') return;
        setState({ loading: false, error: errorMessage(e) });
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
