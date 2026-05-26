import type { LocationObject } from 'expo-location';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  ACTIVE_WALK_SESSION_STORAGE_KEY,
  loadActiveWalkSession,
  persistActiveWalkSession,
} from './active-walk-session';
import {
  WALK_BACKGROUND_LOCATION_TASK,
  handleWalkBackgroundLocations,
  startWalkBackgroundLocationUpdates,
  stopWalkBackgroundLocationUpdates,
} from './background-location-task';
import { updateWalkLiveActivity } from './live-activity-controller';

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
}));

jest.mock('expo-location', () => ({
  Accuracy: { High: 'high' },
  ActivityType: { Fitness: 'fitness' },
  startLocationUpdatesAsync: jest.fn(),
}));

jest.mock('./active-walk-session', () => ({
  ACTIVE_WALK_SESSION_STORAGE_KEY: 'active_walk_session_v1',
  loadActiveWalkSession: jest.fn(),
  persistActiveWalkSession: jest.fn(() => Promise.resolve()),
}));

jest.mock('./live-activity-controller', () => ({
  updateWalkLiveActivity: jest.fn(() => Promise.resolve()),
}));

const definedTaskCall = (TaskManager.defineTask as jest.Mock).mock.calls[0];

const location = (
  latitude: number,
  longitude: number,
  timestamp: string,
): LocationObject => ({
  coords: {
    latitude,
    longitude,
    altitude: null,
    accuracy: 5,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.parse(timestamp),
});

describe('background-location-task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defines the background location task at module load', () => {
    expect(definedTaskCall).toEqual([WALK_BACKGROUND_LOCATION_TASK, expect.any(Function)]);
  });

  it('registers high accuracy background location updates', async () => {
    await startWalkBackgroundLocationUpdates();

    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(WALK_BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 5,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  });

  it('unregisters the background task when it is active', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    await stopWalkBackgroundLocationUpdates();

    expect(TaskManager.isTaskRegisteredAsync).toHaveBeenCalledWith(WALK_BACKGROUND_LOCATION_TASK);
    expect(TaskManager.unregisterTaskAsync).toHaveBeenCalledWith(WALK_BACKGROUND_LOCATION_TASK);
  });

  it('appends background locations, recomputes distance, updates live activity, and preserves pending points', async () => {
    (loadActiveWalkSession as jest.Mock).mockResolvedValue({
      walkId: 'walk-1',
      startedAt: '2026-04-01T00:00:00.000Z',
      selectedDogIds: ['dog-1'],
      dogs: [
        {
          id: 'dog-1',
          name: 'Mugi',
          breed: null,
          gender: 'OTHER',
          createdAt: '2026-04-01T00:00:00Z',
        },
      ],
      points: [
        { lat: 35.6812, lng: 139.7671, recordedAt: '2026-04-01T00:00:00.000Z' },
      ],
      flushedPointCount: 0,
      totalDistanceM: 0,
      events: [],
    });

    await handleWalkBackgroundLocations([
      location(35.6813, 139.7672, '2026-04-01T00:00:05.000Z'),
      location(35.6814, 139.7673, '2026-04-01T00:00:10.000Z'),
    ]);

    expect(persistActiveWalkSession).toHaveBeenCalledWith(
      expect.objectContaining({
        walkId: 'walk-1',
        flushedPointCount: 0,
        points: [
          { lat: 35.6812, lng: 139.7671, recordedAt: '2026-04-01T00:00:00.000Z' },
          { lat: 35.6813, lng: 139.7672, recordedAt: '2026-04-01T00:00:05.000Z' },
          { lat: 35.6814, lng: 139.7673, recordedAt: '2026-04-01T00:00:10.000Z' },
        ],
        totalDistanceM: expect.any(Number),
      }),
    );
    expect((persistActiveWalkSession as jest.Mock).mock.calls[0][0].totalDistanceM).toBeGreaterThan(
      0,
    );
    expect(updateWalkLiveActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        walkId: 'walk-1',
        distanceLabel: expect.stringMatching(/m$/),
      }),
    );
  });

  it('unregisters stale background updates when no active walk session exists', async () => {
    (loadActiveWalkSession as jest.Mock).mockResolvedValue(null);
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    await handleWalkBackgroundLocations([
      location(35.6813, 139.7672, '2026-04-01T00:00:05.000Z'),
    ]);

    expect(TaskManager.unregisterTaskAsync).toHaveBeenCalledWith(WALK_BACKGROUND_LOCATION_TASK);
    expect(persistActiveWalkSession).not.toHaveBeenCalled();
    expect(updateWalkLiveActivity).not.toHaveBeenCalled();
  });

  it('exports the storage key used by active walk persistence', () => {
    expect(ACTIVE_WALK_SESSION_STORAGE_KEY).toBe('active_walk_session_v1');
  });
});
