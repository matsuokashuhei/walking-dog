import { useEffect } from 'react';
import { buildWalkActivityProps } from '@/lib/walk/live-activity';
import { updateWalkLiveActivity } from '@/lib/walk/live-activity-controller';
import { useWalkStore } from '@/stores/walk-store';
import type { Dog } from '@/types/graphql';

// 記録中の距離・イベント数を Live Activity へ反映します。
export function useWalkLiveActivitySync(dogs: Dog[]) {
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const startedAt = useWalkStore((s) => s.startedAt);
  const distanceM = useWalkStore((s) => s.totalDistanceM);
  const events = useWalkStore((s) => s.events);

  useEffect(() => {
    if (phase !== 'recording' || !walkId || !startedAt) return;

    void updateWalkLiveActivity(
      buildWalkActivityProps({
        walkId,
        startedAt,
        distanceM,
        dogs,
        events,
      }),
    );
  }, [distanceM, dogs, events, phase, startedAt, walkId]);
}
