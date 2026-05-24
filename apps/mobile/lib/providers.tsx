import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { useWalkLiveActivityInteractions } from '@/hooks/use-walk-live-activity-interactions';
import { queryClient, setUnauthorizedHandler } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

setUnauthorizedHandler(() => {
  useAuthStore.getState().clearAuth();
});

function WalkLiveActivityBridge({ children }: PropsWithChildren) {
  useWalkLiveActivityInteractions();
  return children;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalkLiveActivityBridge>{children}</WalkLiveActivityBridge>
    </QueryClientProvider>
  );
}
