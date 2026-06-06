import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useWalkScreenViewModel } from './use-walk-screen-view-model';

const mockPush = jest.fn();
const mockWalkSessionStart = jest.fn();
const mockRequestGpsPermission = jest.fn();

let mockPhase: 'ready' | 'recording' | 'finished' = 'ready';
let mockSelectedDogIds = ['dog-1'];
let mockAction: string | undefined;
let mockWalkSessionIsStarting = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ action: mockAction }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      switch (key) {
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

jest.mock('@/hooks/use-walk-session', () => ({
  useWalkSession: () => ({
    start: mockWalkSessionStart,
    isStarting: mockWalkSessionIsStarting,
  }),
}));

jest.mock('@/hooks/use-walk-permissions', () => ({
  useWalkPermissions: () => ({
    requestGpsPermission: mockRequestGpsPermission,
  }),
}));

describe('useWalkScreenViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhase = 'ready';
    mockSelectedDogIds = ['dog-1'];
    mockAction = undefined;
    mockWalkSessionIsStarting = false;
    mockRequestGpsPermission.mockResolvedValue({
      foregroundGranted: true,
      backgroundGranted: true,
    });
    mockWalkSessionStart.mockResolvedValue('walk-1');
  });

  it('returns the current phase and pending state', () => {
    mockPhase = 'finished';
    mockWalkSessionIsStarting = true;

    const { result } = renderHook(() => useWalkScreenViewModel());

    expect(result.current.phase).toBe('finished');
    expect(result.current.isStarting).toBe(true);
  });

  it('does not redirect to walk-recording when the phase becomes recording', () => {
    mockPhase = 'recording';
    mockAction = 'camera';

    renderHook(() => useWalkScreenViewModel());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('alerts and aborts when GPS permission is denied', async () => {
    mockRequestGpsPermission.mockResolvedValue({
      foregroundGranted: false,
      backgroundGranted: false,
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    const { result } = renderHook(() => useWalkScreenViewModel());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(alertSpy).toHaveBeenCalledWith('Permission required', 'GPS permission is required');
    expect(mockWalkSessionStart).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('starts a single-dog walk after GPS permission is granted', async () => {
    mockSelectedDogIds = ['dog-1'];

    const { result } = renderHook(() => useWalkScreenViewModel());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockWalkSessionStart).toHaveBeenCalledWith({
      selectedDogIds: ['dog-1'],
      backgroundLocationEnabled: true,
    });
  });

  it('starts a multi-dog walk after GPS permission is granted', async () => {
    mockSelectedDogIds = ['dog-1', 'dog-2'];

    const { result } = renderHook(() => useWalkScreenViewModel());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockWalkSessionStart).toHaveBeenCalledWith({
      selectedDogIds: ['dog-1', 'dog-2'],
      backgroundLocationEnabled: true,
    });
  });

  it('starts foreground-only tracking when background permission is unavailable', async () => {
    mockRequestGpsPermission.mockResolvedValue({
      foregroundGranted: true,
      backgroundGranted: false,
    });

    const { result } = renderHook(() => useWalkScreenViewModel());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(mockWalkSessionStart).toHaveBeenCalledWith({
      selectedDogIds: ['dog-1'],
      backgroundLocationEnabled: false,
    });
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
