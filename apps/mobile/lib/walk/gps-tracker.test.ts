import * as Location from 'expo-location';
import {
  startWalkBackgroundLocationUpdates,
  stopWalkBackgroundLocationUpdates,
} from './background-location-task';
import { requestPermission, startTracking } from './gps-tracker';

jest.mock('expo-location', () => ({
  Accuracy: { High: 'high' },
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock('./background-location-task', () => ({
  startWalkBackgroundLocationUpdates: jest.fn(),
  stopWalkBackgroundLocationUpdates: jest.fn(),
}));

describe('gps-tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports foreground and background location permissions for walks', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

    await expect(requestPermission()).resolves.toEqual({
      foregroundGranted: true,
      backgroundGranted: true,
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps foreground permission separate when background permission is unavailable', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    await expect(requestPermission()).resolves.toEqual({
      foregroundGranted: true,
      backgroundGranted: false,
    });
  });

  it('starts foreground watch and background task when background tracking is enabled', async () => {
    const remove = jest.fn();
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove });
    (startWalkBackgroundLocationUpdates as jest.Mock).mockResolvedValue(undefined);
    (stopWalkBackgroundLocationUpdates as jest.Mock).mockResolvedValue(undefined);

    const stop = await startTracking(jest.fn(), { backgroundLocationEnabled: true });

    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      expect.any(Function),
    );
    expect(startWalkBackgroundLocationUpdates).toHaveBeenCalledTimes(1);

    await stop();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(stopWalkBackgroundLocationUpdates).toHaveBeenCalledTimes(1);
  });

  it('skips the background task when background tracking is not enabled', async () => {
    const remove = jest.fn();
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove });

    const stop = await startTracking(jest.fn(), { backgroundLocationEnabled: false });

    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
    expect(startWalkBackgroundLocationUpdates).not.toHaveBeenCalled();

    await stop();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(stopWalkBackgroundLocationUpdates).not.toHaveBeenCalled();
  });

  it('keeps foreground tracking active when the background task cannot start', async () => {
    const remove = jest.fn();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove });
    (startWalkBackgroundLocationUpdates as jest.Mock).mockRejectedValue(new Error('Always denied'));

    const stop = await startTracking(jest.fn(), { backgroundLocationEnabled: true });

    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[walk.backgroundLocation.start] unavailable',
      expect.any(Error),
    );

    await stop();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(stopWalkBackgroundLocationUpdates).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
