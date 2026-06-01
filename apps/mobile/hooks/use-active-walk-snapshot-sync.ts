import { useEffect } from 'react';
import { useWalk } from '@/hooks/use-walks';
import { useWalkStore } from '@/stores/walk-store';

const WALK_DISTANCE_POLL_INTERVAL_MS = 10_000;

// Active walk のサーバ snapshot を、復帰 route と通常の記録中タブの両方で同期します。
export function useActiveWalkSnapshotSync(routeWalkId?: string) {
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const setTotalDistanceM = useWalkStore((s) => s.setTotalDistanceM);
  const hydrateRecordingSession = useWalkStore((s) => s.hydrateRecordingSession);

  const isRecording = phase === 'recording';
  const effectiveWalkId = walkId ?? routeWalkId ?? '';
  const { data: walkSnapshot } = useWalk(effectiveWalkId, {
    refetchIntervalMs: isRecording ? WALK_DISTANCE_POLL_INTERVAL_MS : undefined,
  });

  useEffect(() => {
    const distance = walkSnapshot?.distanceM ?? walkSnapshot?.distance;
    if (typeof distance !== 'number') return;
    setTotalDistanceM(distance);
  }, [walkSnapshot?.distance, walkSnapshot?.distanceM, setTotalDistanceM]);

  useEffect(() => {
    if (!routeWalkId || !walkSnapshot || walkSnapshot.status !== 'ACTIVE') return;
    if (phase === 'recording' && walkId === walkSnapshot.id) return;

    hydrateRecordingSession({
      walkId: walkSnapshot.id,
      startedAt: walkSnapshot.startedAt,
      selectedDogIds: walkSnapshot.dogs.map((dog) => dog.id),
      dogs: walkSnapshot.dogs,
      points: walkSnapshot.points ?? [],
      flushedPointCount: walkSnapshot.points?.length ?? 0,
      totalDistanceM: walkSnapshot.distanceM ?? walkSnapshot.distance ?? 0,
      events: walkSnapshot.events ?? [],
    });
  }, [hydrateRecordingSession, phase, routeWalkId, walkId, walkSnapshot]);
}
