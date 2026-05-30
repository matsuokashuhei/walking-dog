import { startTracking } from '@/lib/walk/gps-tracker';
import { stopWalkBackgroundLocationUpdates } from '@/lib/walk/background-location-task';
import { useWalkStore } from '@/stores/walk-store';
import type { WalkPoint, WalkPointInput } from '@/types/graphql';

// Server-side validation rejects payloads over ~200 points per addWalkPoints
// call (request size cap). Keep batches under this ceiling when flushing.
export const MAX_POINTS_PER_BATCH = 200;
export const PERIODIC_FLUSH_INTERVAL_MS = 30_000;

type AddWalkPointsFn = (args: { walkId: string; points: WalkPointInput[] }) => Promise<unknown>;

let activeFlushPromise: Promise<void> | null = null;
let queuedFlushRequest: FlushPendingWalkPointsOptions | null = null;

interface BeginWalkTrackingOptions {
  walkId: string;
  addWalkPoints: AddWalkPointsFn;
  onPoint: (point: WalkPoint) => void;
  onDistanceChange?: (distanceM: number) => void;
}

interface FlushWalkPointsOptions {
  walkId: string;
  points: WalkPoint[];
  addWalkPoints: AddWalkPointsFn;
  onBatchFlushed?: (flushedPointCount: number) => void;
}

interface FlushPendingWalkPointsOptions {
  walkId: string;
  addWalkPoints: AddWalkPointsFn;
}

function logPeriodicFlushError(error: unknown) {
  console.error('Failed to flush walk points during active tracking', error);
}

export async function beginWalkTracking({
  walkId,
  addWalkPoints,
  onPoint,
  onDistanceChange,
}: BeginWalkTrackingOptions) {
  const trackingGeneration = useWalkStore.getState().activateTrackingSession();

  const stopTracking = await startTracking((point) => {
    const state = useWalkStore.getState();
    if (state.trackingGeneration !== trackingGeneration) return;
    if (state.phase !== 'recording') return;

    onPoint(point);
    onDistanceChange?.(useWalkStore.getState().totalDistanceM);
  });

  const flushTimer = setInterval(() => {
    void flushPendingWalkPoints({ walkId, addWalkPoints }).catch(logPeriodicFlushError);
  }, PERIODIC_FLUSH_INTERVAL_MS);

  const cleanup = async () => {
    clearInterval(flushTimer);
    await stopTracking();
  };

  const attached = useWalkStore.getState().attachTrackingCleanup(trackingGeneration, cleanup);
  if (!attached) {
    cleanup();
  }

  return attached;
}

export async function stopWalkTracking() {
  await useWalkStore.getState().stopTrackingSession();
  await stopWalkBackgroundLocationUpdates();
}

export function resetWalkTrackingState() {
  useWalkStore.getState().resetTrackingSession();
  void stopWalkBackgroundLocationUpdates();
}

async function flushPendingWalkPointsNow({
  walkId,
  addWalkPoints,
}: FlushPendingWalkPointsOptions) {
  const state = useWalkStore.getState();
  const flushFrom = state.flushedPointCount;
  const flushTo = state.points.length;
  if (flushTo <= flushFrom) {
    return;
  }

  await flushWalkPoints({
    walkId,
    points: state.points.slice(flushFrom, flushTo),
    addWalkPoints,
    onBatchFlushed: (flushedPointCount) => {
      const currentState = useWalkStore.getState();
      if (currentState.walkId === walkId) {
        currentState.markFlushedPointCount(flushFrom + flushedPointCount);
      }
    },
  });
}

export async function flushPendingWalkPoints(options: FlushPendingWalkPointsOptions) {
  if (activeFlushPromise) {
    queuedFlushRequest = options;
    await activeFlushPromise;
    return;
  }

  const promise = (async () => {
    let nextRequest: FlushPendingWalkPointsOptions | null = options;
    while (nextRequest) {
      const currentRequest = nextRequest;
      queuedFlushRequest = null;
      await flushPendingWalkPointsNow(currentRequest);
      nextRequest = queuedFlushRequest;
    }
  })();

  activeFlushPromise = promise;
  try {
    await promise;
  } finally {
    if (activeFlushPromise === promise) {
      activeFlushPromise = null;
    }
  }
}

export async function flushWalkPoints({
  walkId,
  points,
  addWalkPoints,
  onBatchFlushed,
}: FlushWalkPointsOptions) {
  for (let index = 0; index < points.length; index += MAX_POINTS_PER_BATCH) {
    const batch = points.slice(index, index + MAX_POINTS_PER_BATCH).map((point) => ({
      lat: point.lat,
      lng: point.lng,
      recordedAt: point.recordedAt,
    }));

    await addWalkPoints({ walkId, points: batch });
    onBatchFlushed?.(index + batch.length);
  }
}
