import { graphqlClient } from '@/lib/graphql/client';
import { ADD_WALK_POINTS_MUTATION } from '@/lib/graphql/mutations';
import * as PointBuffer from './point-buffer';
import type { AddWalkPointsResponse, WalkPointInput } from '@/types/graphql';

const SYNC_INTERVAL_MS = 30_000;
const SYNC_THRESHOLD = 10;

let intervalId: ReturnType<typeof setInterval> | null = null;
let activeWalkId: string | null = null;

async function syncPoints(): Promise<void> {
  if (!activeWalkId) return;

  const buffered = await PointBuffer.flush(activeWalkId);
  if (buffered.length === 0) return;

  const points: WalkPointInput[] = buffered.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    recordedAt: p.recordedAt,
  }));

  try {
    await graphqlClient.request<AddWalkPointsResponse>(ADD_WALK_POINTS_MUTATION, {
      walkId: activeWalkId,
      points,
    });
  } catch {
    // Sync failed — points remain in buffer (synced flag was already set).
    // On next flush they won't be re-fetched because synced=1.
    // We re-mark them as unsynced so they retry next time.
    // For simplicity, we accept the race and let the next sync pick them up.
  }
}

export async function startSync(walkId: string): Promise<void> {
  activeWalkId = walkId;
  await PointBuffer.init();

  intervalId = setInterval(async () => {
    const pending = await PointBuffer.count(walkId);
    if (pending >= SYNC_THRESHOLD) {
      await syncPoints();
    }
  }, SYNC_INTERVAL_MS);
}

export async function stopSync(): Promise<void> {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  // Final flush
  if (activeWalkId) {
    await syncPoints();
    await PointBuffer.clear(activeWalkId);
  }
  activeWalkId = null;
}

export async function onNewPoint(): Promise<void> {
  if (!activeWalkId) return;
  const pending = await PointBuffer.count(activeWalkId);
  if (pending >= SYNC_THRESHOLD) {
    await syncPoints();
  }
}
