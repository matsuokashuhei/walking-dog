import { countEventsByType } from '@/lib/walk/events';
import type { Dog, WalkEvent } from '@/types/graphql';
import type { WatchCoordinate, WatchWalkSnapshot } from './types';

interface BuildWatchWalkSnapshotArgs {
  phase: 'ready' | 'recording' | 'finished';
  walkId: string | null;
  startedAt: Date | null;
  dogs: Dog[];
  events: WalkEvent[];
  distanceM: number;
  latestPoint?: WatchCoordinate;
  nowMs?: number;
}

export function buildWatchWalkSnapshot({
  phase,
  walkId,
  startedAt,
  dogs,
  events,
  distanceM,
  latestPoint,
  nowMs = Date.now(),
}: BuildWatchWalkSnapshotArgs): WatchWalkSnapshot {
  if (phase !== 'recording' || !walkId || !startedAt) {
    return {
      isActive: false,
      syncState: 'fresh',
      walkId: null,
      startedAtMs: null,
      distanceM: 0,
      dogs: [],
      latestPoint: null,
      updatedAtMs: nowMs,
    };
  }

  return {
    isActive: true,
    syncState: 'fresh',
    walkId,
    startedAtMs: startedAt.getTime(),
    distanceM,
    dogs: dogs.map((dog) => {
      const counts = countEventsByType(events, { dogId: dog.id });
      return {
        id: dog.id,
        name: dog.name,
        peeCount: counts.pee,
        pooCount: counts.poo,
      };
    }),
    latestPoint: latestPoint ?? null,
    updatedAtMs: nowMs,
  };
}
