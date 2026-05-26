import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Dog, WalkPoint } from '@/types/graphql';
import {
  ACTIVE_WALK_SESSION_STORAGE_KEY,
  clearActiveWalkSession,
  loadActiveWalkSession,
  persistActiveWalkSession,
} from './active-walk-session';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      __reset: () => store.clear(),
    },
  };
});

const dog: Dog = {
  id: 'dog-1',
  name: 'Mugi',
  breed: null,
  gender: 'OTHER',
  createdAt: '2026-04-01T00:00:00Z',
};

const point: WalkPoint = {
  lat: 35.6812,
  lng: 139.7671,
  recordedAt: '2026-04-01T00:00:05Z',
};

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
});

describe('active-walk-session', () => {
  it('persists and loads the active recording snapshot', async () => {
    const snapshot = {
      walkId: 'walk-1',
      startedAt: '2026-04-01T00:00:00.000Z',
      selectedDogIds: ['dog-1'],
      dogs: [dog],
      points: [point],
      flushedPointCount: 0,
      totalDistanceM: 12,
      events: [],
    };

    await persistActiveWalkSession(snapshot);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      ACTIVE_WALK_SESSION_STORAGE_KEY,
      JSON.stringify({ version: 1, session: snapshot }),
    );
    await expect(loadActiveWalkSession()).resolves.toEqual(snapshot);
  });

  it('clears the active recording snapshot', async () => {
    await persistActiveWalkSession({
      walkId: 'walk-1',
      startedAt: '2026-04-01T00:00:00.000Z',
      selectedDogIds: ['dog-1'],
      dogs: [dog],
      points: [point],
      flushedPointCount: 0,
      totalDistanceM: 12,
      events: [],
    });

    await clearActiveWalkSession();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ACTIVE_WALK_SESSION_STORAGE_KEY);
    await expect(loadActiveWalkSession()).resolves.toBeNull();
  });
});
