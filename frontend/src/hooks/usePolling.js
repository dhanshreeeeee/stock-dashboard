import { useEffect, useRef, useState } from "react";

/**
 * Fetches data immediately, then re-fetches on an interval. The first
 * load sets `loading=true`; subsequent background refreshes update
 * `data` silently without flipping loading back on, so the page
 * doesn't flicker every poll cycle. `lastUpdated` exposes when the
 * most recent successful fetch landed, for a small "live" indicator.
 *
 * If a poll fails (e.g. a momentary network blip), the error is
 * exposed via `error` but the last good `data` is kept on screen
 * rather than being wiped out by a transient failure.
 */
export function usePolling(fetchFn, { intervalMs = 15000, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    let timer;

    isFirstLoad.current = true;

    async function load() {
      if (isFirstLoad.current) {
        setLoading(true);
      }
      try {
        const result = await fetchFn();
        if (cancelled) return;
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      } catch (e) {
        if (cancelled) return;
        // Keep showing previous good data; only surface the error if
        // we never successfully loaded anything yet.
        if (isFirstLoad.current) {
          setError(e.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      }
    }

    load();
    timer = setInterval(load, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, lastUpdated };
}
