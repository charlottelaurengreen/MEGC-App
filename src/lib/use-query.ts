import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Loads data when the screen comes into focus (so it's fresh after booking
 * elsewhere) and whenever `deps` change. Keeps the last good data while reloading.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const key = JSON.stringify(deps);

  const load = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const result = await fn();
      if (n === seq.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (n === seq.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (n === seq.current) setLoading(false);
    }
    // `fn` is re-created every render; reload only when the caller's deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { data, error, loading, reload: load, setData };
}
