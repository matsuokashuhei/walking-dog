import {
  buildWalkActivityProps,
  parseWalkActivityTarget,
  walkActivityEventTarget,
  WALK_ACTIVITY_FINISH_TARGET,
  WALK_ACTIVITY_NAME,
} from './live-activity';
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

const labels = {
  walking: 'Walking',
  distance: 'Distance',
  walk: 'Walk',
  pee: 'Pee',
  poo: 'Poop',
  endWalk: 'End walk',
  end: 'End',
};

function event(dogId: string, eventType: 'pee' | 'poo', id: string): WalkEvent {
  return {
    id,
    walkId: 'walk-1',
    dogId,
    eventType,
    occurredAt: '2026-05-24T01:00:00.000Z',
  };
}

describe('walk live activity helpers', () => {
  it('uses the configured Expo widget name', () => {
    expect(WALK_ACTIVITY_NAME).toBe('WalkingDogWalkActivity');
  });

  it('builds props with elapsed timer start, distance, and per-dog event counts', () => {
    const props = buildWalkActivityProps({
      walkId: 'walk-1',
      startedAt: new Date('2026-05-24T00:00:00.000Z'),
      distanceM: 1234,
      dogs,
      events: [
        event('dog-1', 'pee', 'event-1'),
        event('dog-1', 'poo', 'event-2'),
        event('dog-1', 'pee', 'event-3'),
        event('dog-2', 'poo', 'event-4'),
      ],
    });

    expect(props).toEqual({
      walkId: 'walk-1',
      startedAtMs: Date.parse('2026-05-24T00:00:00.000Z'),
      distanceLabel: '1.23 km',
      dogs: [
        {
          id: 'dog-1',
          name: 'Mugi',
          peeCount: 2,
          pooCount: 1,
          peeTarget: 'walk:pee:dog-1',
          pooTarget: 'walk:poo:dog-1',
        },
        {
          id: 'dog-2',
          name: 'Sora',
          peeCount: 0,
          pooCount: 1,
          peeTarget: 'walk:pee:dog-2',
          pooTarget: 'walk:poo:dog-2',
        },
      ],
      finishTarget: WALK_ACTIVITY_FINISH_TARGET,
      labels,
    });
  });

  it('formats short walks in meters', () => {
    const props = buildWalkActivityProps({
      walkId: 'walk-1',
      startedAt: new Date('2026-05-24T00:00:00.000Z'),
      distanceM: 80,
      dogs: [dogs[0]],
      events: [],
    });

    expect(props.distanceLabel).toBe('80 m');
  });

  it('parses dog-specific pee and poop targets', () => {
    expect(parseWalkActivityTarget(walkActivityEventTarget('pee', 'dog-1'))).toEqual({
      kind: 'event',
      eventType: 'pee',
      dogId: 'dog-1',
    });
    expect(parseWalkActivityTarget(walkActivityEventTarget('poo', 'dog-2'))).toEqual({
      kind: 'event',
      eventType: 'poo',
      dogId: 'dog-2',
    });
  });

  it('parses the finish target and rejects malformed targets', () => {
    expect(parseWalkActivityTarget(WALK_ACTIVITY_FINISH_TARGET)).toEqual({ kind: 'finish' });
    expect(parseWalkActivityTarget('pee')).toEqual({ kind: 'unknown' });
    expect(parseWalkActivityTarget('pee:dog-1')).toEqual({ kind: 'unknown' });
    expect(parseWalkActivityTarget('poop:dog-1')).toEqual({ kind: 'unknown' });
    expect(parseWalkActivityTarget('walk:pee:')).toEqual({ kind: 'unknown' });
  });
});
