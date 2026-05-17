import { renderHook } from '@testing-library/react-native';
import { useWalkPermissions } from './use-walk-permissions';
import * as gpsTracker from '@/lib/walk/gps-tracker';

jest.mock('@/lib/walk/gps-tracker', () => ({
  requestPermission: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useWalkPermissions', () => {
  it('requestGpsPermission returns true when location permission is granted', async () => {
    (gpsTracker.requestPermission as jest.Mock).mockResolvedValue(true);
    const { result } = renderHook(() => useWalkPermissions());
    expect(await result.current.requestGpsPermission()).toBe(true);
    expect(gpsTracker.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('requestGpsPermission returns false when location permission is denied', async () => {
    (gpsTracker.requestPermission as jest.Mock).mockResolvedValue(false);
    const { result } = renderHook(() => useWalkPermissions());
    expect(await result.current.requestGpsPermission()).toBe(false);
  });
});
