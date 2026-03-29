import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';
import { PropsWithChildren } from 'react';
import { useAuthStore } from '@/stores/auth-store';

function isUnauthorized(error: unknown): boolean {
  return error instanceof ClientError && error.response.status === 401;
}

const queryCache = new QueryCache({
  onError: (error) => {
    if (isUnauthorized(error)) {
      useAuthStore.getState().clearAuth();
    }
  },
});

const mutationCache = new MutationCache({
  onError: (error) => {
    if (isUnauthorized(error)) {
      useAuthStore.getState().clearAuth();
    }
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
