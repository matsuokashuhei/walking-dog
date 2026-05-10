import type {
  ApiDog,
  ApiTrackPoint,
  ApiUser,
  ApiWalk,
  ApiWalkDog,
  ApiWalkDogEvent,
  ApiWalkEventType,
  ApiWalkPhoto,
  Dog,
  TrackPoint,
  User,
  Walk,
  WalkActivityEventType,
  WalkDog,
  WalkDogEvent,
  WalkEvent,
  WalkPoint,
  WalkPhoto,
} from '@/types/graphql';

const API_TO_UI_WALK_EVENT_TYPE = {
  PEE: 'pee',
  POO: 'poo',
  SNIFF: 'sniff',
  GREET: 'greet',
} as const satisfies Record<ApiWalkEventType, WalkEvent['eventType']>;

const UI_TO_API_WALK_EVENT_TYPE = {
  pee: 'PEE',
  poo: 'POO',
  sniff: 'SNIFF',
  greet: 'GREET',
} as const satisfies Record<WalkActivityEventType, ApiWalkEventType>;

function durationSeconds(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) {
    return null;
  }

  const started = new Date(startedAt).getTime();
  const ended = new Date(endedAt).getTime();

  if (Number.isNaN(started) || Number.isNaN(ended)) {
    return null;
  }

  return Math.max(0, Math.round((ended - started) / 1000));
}

function mapApiWalkPoint(point: ApiTrackPoint): WalkPoint {
  return {
    lat: point.coordinate.latitude,
    lng: point.coordinate.longitude,
    recordedAt: point.trackedAt,
  };
}

export function mapApiDog(dog: ApiDog): Dog {
  return {
    ...dog,
    photoUrl: dog.avatar,
    birthday: dog.birthday ?? null,
    role: 'owner',
    latestWalk: null,
  };
}

export function mapApiUser(user: ApiUser): User {
  return {
    ...user,
    dogs: user.dogs.map(mapApiDog),
    displayName: user.name,
    avatarUrl: user.avatar,
    encounterDetectionEnabled: false,
  };
}

export function mapApiTrackPoint(point: ApiTrackPoint): TrackPoint {
  return point;
}

export function mapApiWalkPhoto(photo: ApiWalkPhoto): WalkPhoto {
  return photo;
}

export function eventToUiType(event: ApiWalkEventType): WalkEvent['eventType'] {
  return API_TO_UI_WALK_EVENT_TYPE[event];
}

export function uiEventToApiType(eventType: WalkEvent['eventType']): ApiWalkEventType {
  if (eventType === 'photo') {
    throw new Error(`Unsupported walk event type: ${eventType}`);
  }

  return UI_TO_API_WALK_EVENT_TYPE[eventType];
}

export function mapApiWalkDogEvent(
  event: ApiWalkDogEvent,
  walkId = '',
  dogId: string | null = null,
): WalkEvent {
  return {
    ...event,
    walkId,
    dogId,
    eventType: eventToUiType(event.event),
    lat: event.coordinate.latitude,
    lng: event.coordinate.longitude,
    photoUrl: null,
  };
}

export function mapApiWalkDogEventStrict(event: ApiWalkDogEvent): WalkDogEvent {
  return event;
}

export function mapApiWalkDog(walkDog: ApiWalkDog): WalkDog {
  return {
    ...walkDog,
    dog: mapApiDog(walkDog.dog),
    events: walkDog.events.map(mapApiWalkDogEventStrict),
  };
}

export function mapApiWalk(walk: ApiWalk): Walk {
  const events = walk.walkDogs.flatMap((walkDog) =>
    walkDog.events.map((event) => mapApiWalkDogEvent(event, walk.id, walkDog.dogId)),
  );
  const trackPoints = walk.trackPoints.map(mapApiTrackPoint);

  return {
    ...walk,
    dogs: walk.dogs.map(mapApiDog),
    walkDogs: walk.walkDogs.map(mapApiWalkDog),
    photos: walk.photos.map(mapApiWalkPhoto),
    trackPoints,
    status: walk.endedAt ? 'FINISHED' : 'ACTIVE',
    distanceM: walk.distance,
    durationSec: durationSeconds(walk.startedAt, walk.endedAt),
    points: trackPoints.map(mapApiWalkPoint),
    events,
  };
}
