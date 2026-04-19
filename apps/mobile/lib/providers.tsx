import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';
import { PropsWithChildren } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { captureGraphQLError } from '@/lib/monitoring/sentry';
import { isNetworkError } from '@/lib/graphql/errors';

function isUnauthorized(error: unknown): boolean {
  return error instanceof ClientError && error.response.status === 401;
}

function reportIfInteresting(error: unknown, kind: 'query' | 'mutation'): void {
  if (isUnauthorized(error)) return;
  if (isNetworkError(error) && !(error instanceof ClientError)) return;
  captureGraphQLError(error, { kind });
}

const queryCache = new QueryCache({
  onError: (error) => {
    if (isUnauthorized(error)) {
      useAuthStore.getState().clearAuth();
      return;
    }
    reportIfInteresting(error, 'query');
  },
});

const mutationCache = new MutationCache({
  onError: (error) => {
    if (isUnauthorized(error)) {
      useAuthStore.getState().clearAuth();
      return;
    }
    reportIfInteresting(error, 'mutation');
  },
});

const queryClient = new QueryClient({
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

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
