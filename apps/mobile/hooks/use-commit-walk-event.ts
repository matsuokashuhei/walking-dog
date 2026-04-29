import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useWalkStore } from '@/stores/walk-store';
import type { WalkEvent } from '@/types/graphql';

// 散歩イベント記録後のストア反映とハプティック通知をまとめるフックです。
export function useCommitWalkEvent() {
  const addEvent = useWalkStore((s) => s.addEvent);

  return useCallback(
    async (run: () => Promise<WalkEvent | null>): Promise<WalkEvent | null> => {
      const event = await run();
      if (!event) return null;

      // サーバー確定済みイベントだけをストアへ追加し、UI の件数表示と触覚反応を揃えます。
      addEvent(event);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return event;
    },
    [addEvent],
  );
}
