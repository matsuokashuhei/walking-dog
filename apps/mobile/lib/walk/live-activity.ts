import type { Dog, WalkActivityEventType, WalkEvent } from '@/types/graphql';

export const WALK_ACTIVITY_NAME = 'WalkingDogWalkActivity';
const WALK_ACTIVITY_TARGET_PREFIX = 'walk';
export const WALK_ACTIVITY_FINISH_TARGET = `${WALK_ACTIVITY_TARGET_PREFIX}:finish`;

export interface WalkActivityDogProps {
  id: string;
  name: string;
  peeCount: number;
  pooCount: number;
  peeTarget: string;
  pooTarget: string;
}

export interface WalkActivityProps {
  walkId: string;
  startedAtMs: number;
  distanceLabel: string;
  dogs: WalkActivityDogProps[];
  finishTarget: string;
}

interface BuildWalkActivityPropsArgs {
  walkId: string;
  startedAt: Date;
  distanceM: number;
  dogs: Dog[];
  events: WalkEvent[];
}

type WalkActivityTarget =
  | { kind: 'event'; eventType: Extract<WalkActivityEventType, 'pee' | 'poo'>; dogId: string }
  | { kind: 'finish' }
  | { kind: 'unknown' };

export function walkActivityEventTarget(
  eventType: Extract<WalkActivityEventType, 'pee' | 'poo'>,
  dogId: string,
): string {
  return `${WALK_ACTIVITY_TARGET_PREFIX}:${eventType}:${dogId}`;
}

function formatWalkDistance(distanceM: number): string {
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(2)} km`;
}

export function buildWalkActivityProps({
  walkId,
  startedAt,
  distanceM,
  dogs,
  events,
}: BuildWalkActivityPropsArgs): WalkActivityProps {
  return {
    walkId,
    startedAtMs: startedAt.getTime(),
    distanceLabel: formatWalkDistance(distanceM),
    dogs: dogs.map((dog) => {
      const dogEvents = events.filter((event) => event.dogId === dog.id);
      return {
        id: dog.id,
        name: dog.name,
        peeCount: dogEvents.filter((event) => event.eventType === 'pee').length,
        pooCount: dogEvents.filter((event) => event.eventType === 'poo').length,
        peeTarget: walkActivityEventTarget('pee', dog.id),
        pooTarget: walkActivityEventTarget('poo', dog.id),
      };
    }),
    finishTarget: WALK_ACTIVITY_FINISH_TARGET,
  };
}

export function parseWalkActivityTarget(target: string): WalkActivityTarget {
  const [prefix, eventType, dogId, extra] = target.split(':');
  if (prefix !== WALK_ACTIVITY_TARGET_PREFIX) return { kind: 'unknown' };
  if (eventType === 'finish' && !dogId && !extra) return { kind: 'finish' };
  if (extra || !dogId) return { kind: 'unknown' };
  if (eventType !== 'pee' && eventType !== 'poo') return { kind: 'unknown' };

  return { kind: 'event', eventType, dogId };
}
