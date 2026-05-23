import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ClientError } from '@/lib/graphql/client-error';

let onUnauthorized: (() => void) | null = null;

function isUnauthorized(error: unknown): boolean {
  return error instanceof ClientError && error.response.status === 401;
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
