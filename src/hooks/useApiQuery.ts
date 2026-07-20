import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  isRetrying: boolean;
};

type QueryOptions = {
  enabled?: boolean;
  retries?: number;
  retryDelayMs?: number;
};

export function useApiQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: QueryOptions = {}
) {
  const { enabled = true, retries = 1, retryDelayMs = 600 } = options;
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: enabled,
    error: null,
    isRetrying: false,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let attempt = 0;

    const run = async () => {
      setState(prev => ({ ...prev, loading: attempt === 0, error: null, isRetrying: attempt > 0 }));

      while (!cancelled && attempt <= retries) {
        try {
          const result = await fetcher();
          if (!cancelled && mountedRef.current) {
            setState({ data: result, loading: false, error: null, isRetrying: false });
          }
          return;
        } catch (error) {
          attempt += 1;
          const message =
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'An unexpected error occurred.';

          if (attempt > retries) {
            if (!cancelled && mountedRef.current) {
              setState(prev => ({ ...prev, loading: false, error: message, isRetrying: false }));
            }
            return;
          }

          if (!cancelled && mountedRef.current) {
            setState(prev => ({ ...prev, error: message, isRetrying: true }));
          }

          await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [key, enabled, fetcher, retries, retryDelayMs]);

  const refetch = async () => {
    setState(prev => ({ ...prev, loading: true, error: null, isRetrying: false }));
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null, isRetrying: false });
      }
      return result;
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'An unexpected error occurred.';

      if (mountedRef.current) {
        setState(prev => ({ ...prev, loading: false, error: message, isRetrying: false }));
      }
      throw error;
    }
  };

  return {
    ...state,
    refetch,
  };
}

