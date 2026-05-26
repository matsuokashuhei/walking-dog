import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Dog, WalkEvent, WalkPoint } from '@/types/graphql';

export const ACTIVE_WALK_SESSION_STORAGE_KEY = 'active_walk_session_v1';

const SCHEMA_VERSION = 1;

export interface ActiveWalkSessionSnapshot {
  walkId: string;
  startedAt: string;
  selectedDogIds: string[];
  dogs: Dog[];
  points: WalkPoint[];
  flushedPointCount: number;
  totalDistanceM: number;
  events: WalkEvent[];
}

interface ActiveWalkSessionFile {
  version: number;
  session: ActiveWalkSessionSnapshot;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid active walk session: ${field} must be a string`);
  }
}

function assertArray(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid active walk session: ${field} must be an array`);
  }
}

function parseActiveWalkSession(raw: string): ActiveWalkSessionSnapshot {
  const parsed = JSON.parse(raw) as unknown;
  if (!isObject(parsed) || parsed.version !== SCHEMA_VERSION || !isObject(parsed.session)) {
    throw new Error('Invalid active walk session schema');
  }

  const session = parsed.session;
  assertString(session.walkId, 'walkId');
  assertString(session.startedAt, 'startedAt');
  assertArray(session.selectedDogIds, 'selectedDogIds');
  assertArray(session.dogs, 'dogs');
  assertArray(session.points, 'points');
  assertArray(session.events, 'events');

  if (typeof session.flushedPointCount !== 'number') {
    throw new Error('Invalid active walk session: flushedPointCount must be a number');
  }
  if (typeof session.totalDistanceM !== 'number') {
    throw new Error('Invalid active walk session: totalDistanceM must be a number');
  }

  return {
    walkId: session.walkId,
    startedAt: session.startedAt,
    selectedDogIds: session.selectedDogIds as string[],
    dogs: session.dogs as Dog[],
    points: session.points as WalkPoint[],
    flushedPointCount: session.flushedPointCount,
    totalDistanceM: session.totalDistanceM,
    events: session.events as WalkEvent[],
  };
}

export async function persistActiveWalkSession(
  session: ActiveWalkSessionSnapshot,
): Promise<void> {
  const file: ActiveWalkSessionFile = { version: SCHEMA_VERSION, session };
  await AsyncStorage.setItem(ACTIVE_WALK_SESSION_STORAGE_KEY, JSON.stringify(file));
}

export async function loadActiveWalkSession(): Promise<ActiveWalkSessionSnapshot | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_WALK_SESSION_STORAGE_KEY);
  if (!raw) return null;
  return parseActiveWalkSession(raw);
}

export async function clearActiveWalkSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_WALK_SESSION_STORAGE_KEY);
}
