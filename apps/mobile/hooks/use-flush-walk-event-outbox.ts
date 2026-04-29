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

// outbox に残った散歩イベントを順番に再送し、最初の失敗で次回へ持ち越します。
export function useFlushWalkEventOutbox() {
  const recordWalkEvent = useRecordWalkEvent();
  const addEvent = useWalkStore((s) => s.addEvent);

  return useCallback(async (): Promise<FlushOutcome> => {
    const pending = await listPendingEvents();
    let flushed = 0;
    for (const item of pending) {
      try {
        // 再送に成功したイベントはストアにも反映し、元のタップ操作と同じ触覚反応を返します。
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
        // まだオフラインまたはサーバー側で失敗している前提で、残りは outbox に残します。
        break;
      }
    }
    return { flushed, remaining: pending.length - flushed };
  }, [recordWalkEvent, addEvent]);
}
