import type { Dog, WalkActivityEventType, WalkEvent } from '@/types/graphql';
import i18n from '@/lib/i18n';

export const WALK_ACTIVITY_NAME = 'WalkingDogWalkActivity';
const WALK_ACTIVITY_TARGET_PREFIX = 'walk';
export const WALK_ACTIVITY_FINISH_TARGET = `${WALK_ACTIVITY_TARGET_PREFIX}:finish`;

interface WalkActivityDogProps {
  id: string;
  name: string;
  peeCount: number;
  pooCount: number;
  peeTarget: string;
  pooTarget: string;
}

interface WalkActivityLabels {
  walking: string;
  distance: string;
  walk: string;
  pee: string;
  poo: string;
  endWalk: string;
  end: string;
}

export interface WalkActivityProps {
  walkId: string;
  startedAtMs: number;
  distanceLabel: string;
  dogs: WalkActivityDogProps[];
  finishTarget: string;
  labels: WalkActivityLabels;
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

function buildWalkActivityLabels(): WalkActivityLabels {
  return {
    walking: i18n.t('walk.activity.walking'),
    distance: i18n.t('walk.activity.distance'),
    walk: i18n.t('walk.activity.walk'),
    pee: i18n.t('walk.activity.pee'),
    poo: i18n.t('walk.activity.poo'),
    endWalk: i18n.t('walk.activity.endWalk'),
    end: i18n.t('walk.activity.end'),
  };
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
    labels: buildWalkActivityLabels(),
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
