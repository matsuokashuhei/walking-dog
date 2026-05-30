import { useEffect, useMemo } from 'react';
import { publishWalkSnapshot } from '@/lib/watch/bridge';
import { buildWatchWalkSnapshot } from '@/lib/watch/snapshot';
import { useWalkStore } from '@/stores/walk-store';

export function useWatchWalkSnapshotSync() {
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const startedAt = useWalkStore((s) => s.startedAt);
  const dogs = useWalkStore((s) => s.dogs);
  const distanceM = useWalkStore((s) => s.totalDistanceM);
  const points = useWalkStore((s) => s.points);
  const events = useWalkStore((s) => s.events);

  const latestPoint = useMemo(
    () =>
      points.length
        ? {
            lat: points[points.length - 1].lat,
            lng: points[points.length - 1].lng,
          }
        : undefined,
    [points],
  );

  useEffect(() => {
    void publishWalkSnapshot(
      buildWatchWalkSnapshot({
        phase,
        walkId,
        startedAt,
        dogs,
        events,
        distanceM,
        latestPoint,
      }),
    ).catch((error) => {
      console.error('[watch.snapshot] failed to publish walk snapshot', error);
    });
  }, [distanceM, dogs, events, latestPoint, phase, startedAt, walkId]);
}
