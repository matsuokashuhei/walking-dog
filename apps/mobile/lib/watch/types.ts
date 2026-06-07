import type { WalkActivityEventType } from '@/types/graphql';

export interface WatchCoordinate {
  lat: number;
  lng: number;
}

export interface WatchWalkSnapshotDog {
  id: string;
  name: string;
  peeCount: number;
  pooCount: number;
}

export type WatchWalkSyncState = 'fresh' | 'stale' | 'offline';

export interface WatchWalkSnapshot {
  isActive: boolean;
  syncState: WatchWalkSyncState;
  walkId: string | null;
  startedAtMs: number | null;
  distanceM: number;
  dogs: WatchWalkSnapshotDog[];
  latestPoint: WatchCoordinate | null;
  updatedAtMs: number;
}

export type WatchWalkCommand =
  | {
      id: string;
      kind: 'recordEvent';
      walkId: string;
      eventType: Extract<WalkActivityEventType, 'pee' | 'poo'>;
      dogId?: string;
      occurredAt: string;
      lat?: number;
      lng?: number;
    }
  | {
      id: string;
      kind: 'endWalk';
      walkId: string;
      occurredAt: string;
    };
