import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { useWatchWalkCommandProcessor } from '@/hooks/use-watch-walk-command-processor';
import { useWatchWalkSnapshotSync } from '@/hooks/use-watch-walk-snapshot-sync';
import { useWalkFinishedNavigation } from '@/hooks/use-walk-finished-navigation';
import { useWalkLiveActivityInteractions } from '@/hooks/use-walk-live-activity-interactions';
import { queryClient, setUnauthorizedHandler } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

setUnauthorizedHandler(() => {
  useAuthStore.getState().clearAuth();
});

function WalkLiveActivityBridge({ children }: PropsWithChildren) {
  useWalkLiveActivityInteractions();
  useWalkFinishedNavigation();
  useWatchWalkCommandProcessor();
  useWatchWalkSnapshotSync();
  return children;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalkLiveActivityBridge>{children}</WalkLiveActivityBridge>
    </QueryClientProvider>
  );
}
