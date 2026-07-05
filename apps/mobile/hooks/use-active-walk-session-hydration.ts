import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { runDetached } from '@/lib/run-detached';
import { loadActiveWalkSession } from '@/lib/walk/active-walk-session';
import { useWalkStore } from '@/stores/walk-store';

export function useActiveWalkSessionHydration() {
  const hydrate = useCallback(async () => {
    try {
      const session = await loadActiveWalkSession();
      if (!session) return;

      const state = useWalkStore.getState();
      if (state.phase === 'recording' && state.walkId !== session.walkId) return;

      state.hydrateRecordingSession(session);
    } catch (error) {
      console.error('[walk.activeSession.hydrate] failed', error);
    }
  }, []);

  useEffect(() => {
    runDetached(hydrate(), 'walk.activeSession.hydrate');

    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        runDetached(hydrate(), 'walk.activeSession.hydrate');
      }
    });

    return () => subscription.remove();
  }, [hydrate]);
}
