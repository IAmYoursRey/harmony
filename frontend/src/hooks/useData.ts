import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/apiClient";
import { TOKEN_KEY } from "@/data/accounts";

interface CacheEntry<T> {
  data?: T;
  error?: Error;
  promise?: Promise<T>;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<any>>();
const cacheEmitter = new EventTarget();

export function mutateData(endpoint: string, newData?: any) {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const key = `${token}:${endpoint}`;

  if (newData !== undefined) {
    globalCache.set(key, { data: newData, timestamp: Date.now() });
    cacheEmitter.dispatchEvent(new CustomEvent(key));
  } else {
    globalCache.delete(key);
    cacheEmitter.dispatchEvent(new CustomEvent(key));
  }
}

export function clearDataCache(prefix?: string) {
  if (prefix) {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    const start = `${token}:${prefix}`;
    for (const key of globalCache.keys()) {
      if (key.startsWith(start)) {
        globalCache.delete(key);
        cacheEmitter.dispatchEvent(new CustomEvent(key));
      }
    }
  } else {
    globalCache.clear();
  }
}

export function useData<T>(
  endpoint: string | null | undefined,
  options?: { ttl?: number; revalidateOnFocus?: boolean },
) {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const key = endpoint ? `${token}:${endpoint}` : "";
  const ttl = options?.ttl ?? 60000; // 1 minute default TTL

  const getSnapshot = useCallback(() => globalCache.get(key), [key]);

  const [state, setState] = useState<{
    data: T | undefined;
    error: Error | undefined;
    isValidating: boolean;
  }>(() => {
    const snapshot = getSnapshot();
    return {
      data: snapshot?.data,
      error: snapshot?.error,
      isValidating: !snapshot?.data && !!endpoint,
    };
  });

  const fetcher = useCallback(
    async (ignoreCache = false) => {
      if (!endpoint) return;

      const snapshot = globalCache.get(key);
      const isStale = !snapshot || Date.now() - snapshot.timestamp > ttl;

      if (!ignoreCache && !isStale && snapshot?.data !== undefined) {
        if (state.isValidating) {
          setState((s) => ({ ...s, isValidating: false }));
        }
        return;
      }

      if (snapshot?.promise) {
        if (!state.isValidating)
          setState((s) => ({ ...s, isValidating: true }));
        try {
          await snapshot.promise;
        } catch (e) {}
        return;
      }

      setState((s) => ({ ...s, isValidating: true }));

      const promise = apiClient.get<T>(endpoint, { ttl: 0 }); // Bypass apiClient's own cache
      globalCache.set(key, { ...snapshot, promise, timestamp: Date.now() });

      try {
        const data = await promise;
        globalCache.set(key, { data, timestamp: Date.now() });
        setState({ data, error: undefined, isValidating: false });
        cacheEmitter.dispatchEvent(new CustomEvent(key));
      } catch (error: any) {
        globalCache.set(key, { error, timestamp: Date.now() });
        setState({ data: snapshot?.data, error, isValidating: false });
        cacheEmitter.dispatchEvent(new CustomEvent(key));
      }
    },
    [endpoint, key, ttl, state.isValidating],
  );

  useEffect(() => {
    if (!endpoint) {
      setState({ data: undefined, error: undefined, isValidating: false });
      return;
    }

    const onUpdate = () => {
      const snap = globalCache.get(key);
      setState({
        data: snap?.data,
        error: snap?.error,
        isValidating: !!snap?.promise,
      });
    };

    cacheEmitter.addEventListener(key, onUpdate);
    fetcher();

    return () => {
      cacheEmitter.removeEventListener(key, onUpdate);
    };
  }, [endpoint, key, fetcher]);

  useEffect(() => {
    if (!options?.revalidateOnFocus) return;
    const onFocus = () => fetcher(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetcher, options?.revalidateOnFocus]);

  return {
    data: state.data,
    error: state.error,
    isLoading:
      state.data === undefined &&
      state.error === undefined &&
      state.isValidating,
    isValidating: state.isValidating,
    mutate: (newData?: T) => mutateData(endpoint!, newData),
    revalidate: () => fetcher(true),
  };
}
