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
  it('requestGpsPermission returns foreground and background permission capability', async () => {
    const permission = { foregroundGranted: true, backgroundGranted: false };
    (gpsTracker.requestPermission as jest.Mock).mockResolvedValue(permission);
    const { result } = renderHook(() => useWalkPermissions());
    expect(await result.current.requestGpsPermission()).toBe(permission);
    expect(gpsTracker.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('requestGpsPermission returns denied foreground capability', async () => {
    const permission = { foregroundGranted: false, backgroundGranted: false };
    (gpsTracker.requestPermission as jest.Mock).mockResolvedValue(permission);
    const { result } = renderHook(() => useWalkPermissions());
    expect(await result.current.requestGpsPermission()).toBe(permission);
  });
});
