import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useWalkScreenViewModel } from './use-walk-screen-view-model';

const mockPush = jest.fn();
const mockWalkSessionStart = jest.fn();
const mockBleStart = jest.fn();
const mockEncounterStart = jest.fn();
const mockEncounterOnDeviceDetected = jest.fn();
const mockRequestGpsPermission = jest.fn();
const mockRequestBlePermission = jest.fn();

let mockPhase: 'ready' | 'recording' | 'finished' = 'ready';
let mockSelectedDogIds = ['dog-1'];
let mockAction: string | undefined;
let mockEncounterDetectionEnabled = true;
let mockWalkSessionIsStarting = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ action: mockAction }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      switch (key) {
        case 'walk.liveActivity.walking':
          return 'Walking';
        case 'walk.liveActivity.walkingWithDogs':
          return `Walking with ${options?.count ?? 0} dogs`;
        case 'walk.permission.title':
          return 'Permission required';
        case 'walk.permission.message':
          return 'GPS permission is required';
        case 'common.error':
          return 'Error';
        case 'walk.error.startFailed':
          return 'Walk start failed';
        default:
          return key;
      }
    },
  }),
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: (selector: (state: { phase: string; selectedDogIds: string[] }) => unknown) =>
    selector({ phase: mockPhase, selectedDogIds: mockSelectedDogIds }),
}));

jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: { encounterDetectionEnabled: mockEncounterDetectionEnabled },
  }),
}));

jest.mock('@/hooks/use-walk-session', () => ({
  useWalkSession: () => ({
    start: mockWalkSessionStart,
    isStarting: mockWalkSessionIsStarting,
  }),
}));

jest.mock('@/hooks/use-ble-session', () => ({
  useBleSession: () => ({
    start: mockBleStart,
  }),
}));

jest.mock('@/hooks/use-encounter-session', () => ({
  useEncounterSession: () => ({
    start: mockEncounterStart,
    onDeviceDetected: mockEncounterOnDeviceDetected,
  }),
}));

jest.mock('@/hooks/use-walk-permissions', () => ({
  useWalkPermissions: () => ({
    requestGpsPermission: mockRequestGpsPermission,
    requestBlePermission: mockRequestBlePermission,
  }),
}));

describe('useWalkScreenViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhase = 'ready';
    mockSelectedDogIds = ['dog-1'];
    mockAction = undefined;
    mockEncounterDetectionEnabled = true;
    mockWalkSessionIsStarting = false;
    mockRequestGpsPermission.mockResolvedValue(true);
    mockRequestBlePermission.mockResolvedValue(true);
    mockWalkSessionStart.mockResolvedValue('walk-1');
  });

  it('returns the current phase and pending state', () => {
    mockPhase = 'finished';
    mockWalkSessionIsStarting = true;

    const { result } = renderHook(() => useWalkScreenViewModel());

    expect(result.current.phase).toBe('finished');
    expect(result.current.isStarting).toBe(true);
  });

  it('redirects to walk-recording and preserves the camera action', () => {
    mockPhase = 'recording';
    mockAction = 'camera';

    renderHook(() => useWalkScreenViewModel());

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/walk-recording',
      params: { action: 'camera' },
    });
  });

  it('alerts and aborts when GPS permission is denied', async () => {
    mockRequestGpsPermission.mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    const { result } = renderHook(() => useWalkScreenViewModel());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(alertSpy).toHaveBeenCalledWith('Permission required', 'GPS permission is required');
    expect(mockWalkSessionStart).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('starts a single-dog walk without BLE flow when encounter detection is disabled', async () => {
    mockEncounterDetectionEnabled = false;
    mockSelectedDogIds = ['dog-1'];

    const { result } = renderHook(() => useWalkScreenViewModel());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockWalkSessionStart).toHaveBeenCalledWith({
      selectedDogIds: ['dog-1'],
      liveActivityDogName: 'Walking',
    });
    expect(mockRequestBlePermission).not.toHaveBeenCalled();
    expect(mockEncounterStart).not.toHaveBeenCalled();
    expect(mockBleStart).not.toHaveBeenCalled();
  });

  it('starts encounter detection and BLE scanning for a multi-dog walk when permissions are granted', async () => {
    mockSelectedDogIds = ['dog-1', 'dog-2'];

    const { result } = renderHook(() => useWalkScreenViewModel());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockWalkSessionStart).toHaveBeenCalledWith({
      selectedDogIds: ['dog-1', 'dog-2'],
      liveActivityDogName: 'Walking with 2 dogs',
    });
    expect(mockEncounterStart).toHaveBeenCalledWith('walk-1');
    expect(mockBleStart).toHaveBeenCalledWith('walk-1', expect.any(Function));
  });

  it('shows a start failure alert when the session start throws', async () => {
    mockWalkSessionStart.mockRejectedValue(new Error('boom'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    const { result } = renderHook(() => useWalkScreenViewModel());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Walk start failed');

    alertSpy.mockRestore();
  });
});
