import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { isUnauthorizedError } from '@/lib/graphql/errors';
import { useAuthStore } from '@/stores/auth-store';

function clearAuthOnUnauthorized(error: unknown): void {
  if (isUnauthorizedError(error)) {
    useAuthStore.getState().clearAuth();
  }
}

const queryCache = new QueryCache({
  onError: clearAuthOnUnauthorized,
});

const mutationCache = new MutationCache({
  onError: clearAuthOnUnauthorized,
});

const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) {
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
