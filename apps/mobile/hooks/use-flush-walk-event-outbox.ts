import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  listPendingEvents,
  removePendingEvent,
} from '@/lib/walk/event-outbox';
import { useWalkStore } from '@/stores/walk-store';
import { useRecordWalkEvent } from './use-walk-event-mutations';

export interface FlushOutcome {
  flushed: number;
  remaining: number;
}

/**
 * Replay queued walk events one-by-one. Stops on the first failure on the
 * assumption that we are still offline (or the server is unhappy); the
 * remaining items stay in the outbox for the next attempt.
 *
 * Each successfully replayed event is appended to the in-memory walk store
 * and triggers a light haptic so the UI counter and feedback match what the
 * user did at the original tap. This intentionally mirrors the post-mutation
 * step in `WalkEventActions` rather than going through `useCommitWalkEvent`,
 * which is part of a separate facade refactor (M1) that may not be merged
 * yet.
 */
export function useFlushWalkEventOutbox() {
  const recordWalkEvent = useRecordWalkEvent();
  const addEvent = useWalkStore((s) => s.addEvent);

  return useCallback(async (): Promise<FlushOutcome> => {
    const pending = await listPendingEvents();
    let flushed = 0;
    for (const item of pending) {
      try {
        const event = await recordWalkEvent.mutateAsync({
          walkId: item.walkId,
          ...(item.dogId !== undefined ? { dogId: item.dogId } : {}),
          eventType: item.eventType,
          occurredAt: item.occurredAt,
          ...(item.lat != null && item.lng != null
            ? { lat: item.lat, lng: item.lng }
            : {}),
        });
        addEvent(event);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await removePendingEvent(item.id);
        flushed += 1;
      } catch {
        break;
      }
    }
    return { flushed, remaining: pending.length - flushed };
  }, [recordWalkEvent, addEvent]);
}
