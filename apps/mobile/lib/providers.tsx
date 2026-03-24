import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';
import { PropsWithChildren } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const queryCache = new QueryCache({
  onError: (error) => {
    if (error instanceof ClientError && error.response.status === 401) {
      useAuthStore.getState().clearAuth();
    }
  },
});

const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof ClientError && error.response.status === 401) {
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
