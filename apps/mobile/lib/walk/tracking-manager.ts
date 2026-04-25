import { startTracking } from '@/lib/walk/gps-tracker';
import { useWalkStore } from '@/stores/walk-store';
import type { WalkPoint, WalkPointInput } from '@/types/graphql';

// Server-side validation rejects payloads over ~200 points per addWalkPoints
// call (request size cap). Keep batches under this ceiling when flushing.
export const MAX_POINTS_PER_BATCH = 200;

interface BeginWalkTrackingOptions {
  onPoint: (point: WalkPoint) => void;
  onDistanceChange?: (distanceM: number) => void;
}

interface FlushWalkPointsOptions {
  walkId: string;
  points: WalkPoint[];
  uploadedPointCount: number;
  addWalkPoints: (args: { walkId: string; points: WalkPointInput[] }) => Promise<unknown>;
  markUploadedPointCount: (count: number) => void;
}

export async function beginWalkTracking({ onPoint, onDistanceChange }: BeginWalkTrackingOptions) {
  const trackingGeneration = useWalkStore.getState().activateTrackingSession();

  const stopTracking = await startTracking((point) => {
    const state = useWalkStore.getState();
    if (state.trackingGeneration !== trackingGeneration) return;
    if (state.phase !== 'recording') return;
    if (state.isPaused) return;

    onPoint(point);
    onDistanceChange?.(useWalkStore.getState().totalDistanceM);
  });

  const attached = useWalkStore.getState().attachTrackingCleanup(trackingGeneration, stopTracking);
  if (!attached) {
    stopTracking();
  }

  return attached;
}

export function stopWalkTracking() {
  useWalkStore.getState().stopTrackingSession();
}

export function resetWalkTrackingState() {
  useWalkStore.getState().resetTrackingSession();
}

export async function flushWalkPoints({
  walkId,
  points,
  uploadedPointCount,
  addWalkPoints,
  markUploadedPointCount,
}: FlushWalkPointsOptions) {
  for (
    let index = Math.min(uploadedPointCount, points.length);
    index < points.length;
    index += MAX_POINTS_PER_BATCH
  ) {
    const batch = points.slice(index, index + MAX_POINTS_PER_BATCH).map((point) => ({
      lat: point.lat,
      lng: point.lng,
      recordedAt: point.recordedAt,
    }));

    await addWalkPoints({ walkId, points: batch });
    markUploadedPointCount(index + batch.length);
  }
}
