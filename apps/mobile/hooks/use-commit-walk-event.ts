import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useWalkStore } from '@/stores/walk-store';
import type { WalkEvent } from '@/types/graphql';

/**
 * Facade for the post-mutation step of recording a walk event: append the
 * server-confirmed event to the walk-store cache and fire the user-feedback
 * haptic. Wraps the previously inline `commitEvent` helper from
 * `WalkEventActions.tsx` so consumers don't have to know about the store
 * shape or the exact haptic style — they call `commit(() => recordEvent(...))`
 * and get back the recorded event (or `null` if the mutation didn't return
 * one).
 */
export function useCommitWalkEvent() {
  const addEvent = useWalkStore((s) => s.addEvent);

  return useCallback(
    async (run: () => Promise<WalkEvent | null>): Promise<WalkEvent | null> => {
      const event = await run();
      if (!event) return null;

      addEvent(event);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return event;
    },
    [addEvent],
  );
}
