import { requestPermission, startTracking } from './gps-tracker';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

import * as Location from 'expo-location';

describe('requestPermission', () => {
  it('returns true when permission granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    const result = await requestPermission();
    expect(result).toBe(true);
  });

  it('returns false when permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    const result = await requestPermission();
    expect(result).toBe(false);
  });
});

describe('startTracking', () => {
  it('calls watchPositionAsync and returns cleanup function', async () => {
    const mockRemove = jest.fn();
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove: mockRemove });

    const onPosition = jest.fn();
    const stop = await startTracking(onPosition);

    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: Location.Accuracy.High }),
      expect.any(Function),
    );

    stop();
    expect(mockRemove).toHaveBeenCalled();
  });
});
