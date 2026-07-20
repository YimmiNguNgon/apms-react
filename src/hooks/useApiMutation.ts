import { useState } from 'react';
import { ApiError } from '../services/api';

type MutationState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type MutationFn<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

export function useApiMutation<TInput, TOutput>(mutation: MutationFn<TInput, TOutput>) {
  const [state, setState] = useState<MutationState<TOutput>>({
    data: null,
    loading: false,
    error: null,
  });

  const run = async (input: TInput) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await mutation(input);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'An unexpected error occurred.';
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  };

  return {
    ...state,
    run,
  };
}

