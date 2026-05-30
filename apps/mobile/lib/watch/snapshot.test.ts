import { buildWatchWalkSnapshot } from './snapshot';
import type { Dog, WalkEvent } from '@/types/graphql';

const dogs: Dog[] = [
  {
    id: 'dog-1',
    name: 'Mugi',
    breed: null,
    gender: 'OTHER',
    createdAt: '2026-05-24T00:00:00.000Z',
  },
  {
    id: 'dog-2',
    name: 'Sora',
    breed: null,
    gender: 'OTHER',
    createdAt: '2026-05-24T00:00:00.000Z',
  },
];

function event(dogId: string, eventType: 'pee' | 'poo', id: string): WalkEvent {
  return {
    id,
    walkId: 'walk-1',
    dogId,
    eventType,
    occurredAt: '2026-05-24T01:00:00.000Z',
    lat: 35.68,
    lng: 139.76,
    photoUrl: null,
  };
}

describe('buildWatchWalkSnapshot', () => {
  it('publishes an inactive snapshot outside an active walk', () => {
    expect(
      buildWatchWalkSnapshot({
        phase: 'ready',
        walkId: null,
        startedAt: null,
        dogs,
        events: [],
        distanceM: 0,
        latestPoint: undefined,
        nowMs: 1770000000000,
      }),
    ).toEqual({
      isActive: false,
      walkId: null,
      startedAtMs: null,
      distanceM: 0,
      dogs: [],
      latestPoint: null,
      updatedAtMs: 1770000000000,
    });
  });

  it('publishes active walk dogs, counts, and latest coordinate', () => {
    expect(
      buildWatchWalkSnapshot({
        phase: 'recording',
        walkId: 'walk-1',
        startedAt: new Date('2026-05-24T00:00:00.000Z'),
        dogs,
        events: [
          event('dog-1', 'pee', 'event-1'),
          event('dog-1', 'poo', 'event-2'),
          event('dog-1', 'pee', 'event-3'),
          event('dog-2', 'poo', 'event-4'),
        ],
        distanceM: 1234,
        latestPoint: { lat: 35.68, lng: 139.76 },
        nowMs: 1770000000000,
      }),
    ).toEqual({
      isActive: true,
      walkId: 'walk-1',
      startedAtMs: Date.parse('2026-05-24T00:00:00.000Z'),
      distanceM: 1234,
      dogs: [
        { id: 'dog-1', name: 'Mugi', peeCount: 2, pooCount: 1 },
        { id: 'dog-2', name: 'Sora', peeCount: 0, pooCount: 1 },
      ],
      latestPoint: { lat: 35.68, lng: 139.76 },
      updatedAtMs: 1770000000000,
    });
  });
});
