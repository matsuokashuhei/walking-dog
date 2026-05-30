import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useWalkStore } from '@/stores/walk-store';

// 散歩終了後の画面遷移を全入口で統一します。
export function useWalkFinishedNavigation() {
  const phase = useWalkStore((s) => s.phase);
  const previousPhaseRef = useRef(phase);
  const didNavigateForFinishedWalkRef = useRef(false);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (phase === 'recording') {
      didNavigateForFinishedWalkRef.current = false;
      return;
    }

    if (
      previousPhase === 'recording' &&
      phase === 'finished' &&
      !didNavigateForFinishedWalkRef.current
    ) {
      didNavigateForFinishedWalkRef.current = true;
      router.dismissTo('/(tabs)/walk');
    }
  }, [phase]);
}
