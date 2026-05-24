import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isUnauthorizedError } from '@/lib/graphql/errors';

let onUnauthorized: (() => void) | null = null;

function isUnauthorized(error: unknown): boolean {
  return isUnauthorizedError(error);
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

const queryCache = new QueryCache({
  onError: (error) => {
    if (isUnauthorized(error)) {
      onUnauthorized?.();
    }
  },
});

const mutationCache = new MutationCache({
  onError: (error) => {
    if (isUnauthorized(error)) {
      onUnauthorized?.();
    }
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (isUnauthorized(error)) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
