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
  addWalkPoints: (args: { walkId: string; points: WalkPointInput[] }) => Promise<unknown>;
}

export async function beginWalkTracking({ onPoint, onDistanceChange }: BeginWalkTrackingOptions) {
  const trackingGeneration = useWalkStore.getState().activateTrackingSession();

  const stopTracking = await startTracking((point) => {
    const state = useWalkStore.getState();
    if (state.trackingGeneration !== trackingGeneration) return;
    if (state.phase !== 'recording') return;

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

/**
 * 同じ `recordedAt` を持つ point を 1 件に縮約する（最初に出現したものを保持）。
 *
 * DynamoDB `BatchWriteItem` は同一バッチ内に同じ primary key を持つ
 * `WriteRequest` を許容しない。`(walk_id, recorded_at)` が PK/SK のため、
 * `recordedAt` が一致する 2 件は同じキーとして衝突する。サーバー側にも
 * 防御的 dedup があるが、ネットワーク負荷を減らすためクライアントでも縮約する。
 */
function dedupePointsByRecordedAt(points: WalkPoint[]): WalkPoint[] {
  const seen = new Set<string>();
  return points.filter((p) => {
    if (seen.has(p.recordedAt)) return false;
    seen.add(p.recordedAt);
    return true;
  });
}

export async function flushWalkPoints({ walkId, points, addWalkPoints }: FlushWalkPointsOptions) {
  const deduped = dedupePointsByRecordedAt(points);

  for (let index = 0; index < deduped.length; index += MAX_POINTS_PER_BATCH) {
    const batch = deduped.slice(index, index + MAX_POINTS_PER_BATCH).map((point) => ({
      lat: point.lat,
      lng: point.lng,
      recordedAt: point.recordedAt,
    }));

    await addWalkPoints({ walkId, points: batch });
  }
}
