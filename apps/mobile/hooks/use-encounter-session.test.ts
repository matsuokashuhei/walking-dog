import { act, renderHook } from '@testing-library/react-native';
import { useEncounterSession } from './use-encounter-session';
import * as encounterMutations from './use-encounter-mutations';
import { EncounterTracker } from '@/lib/ble/encounter-tracker';

jest.mock('./use-encounter-mutations', () => ({
  useRecordEncounter: jest.fn(),
  useUpdateEncounterDuration: jest.fn(),
}));

jest.mock('@/lib/ble/encounter-tracker', () => {
  const instances: Array<{
    start: jest.Mock;
    stop: jest.Mock;
    onDeviceDetected: jest.Mock;
    callbacks: unknown;
  }> = [];
  const EncounterTracker = jest.fn().mockImplementation(function (
    this: unknown,
    callbacks: unknown,
  ) {
    const instance = {
      start: jest.fn(),
      stop: jest.fn(),
      onDeviceDetected: jest.fn(),
      callbacks,
    };
    instances.push(instance);
    Object.assign(this as object, instance);
    return instance;
  });
  return { EncounterTracker, __instances: instances };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __instances } = require('@/lib/ble/encounter-tracker') as {
  __instances: Array<{
    start: jest.Mock;
    stop: jest.Mock;
    onDeviceDetected: jest.Mock;
    callbacks: {
      onEncounterDetected: (w: string, d: number) => void;
      onEncounterFinalized: (w: string, d: number) => void;
    };
  }>;
};

const mockRecordMutate = jest.fn();
const mockUpdateMutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  __instances.length = 0;
  (encounterMutations.useRecordEncounter as jest.Mock).mockReturnValue({
    mutate: mockRecordMutate,
  });
  (encounterMutations.useUpdateEncounterDuration as jest.Mock).mockReturnValue({
    mutate: mockUpdateMutate,
  });
});

describe('useEncounterSession', () => {
  it('start() creates an EncounterTracker and calls tracker.start', () => {
    const { result } = renderHook(() => useEncounterSession());
    act(() => {
      result.current.start('walk-1');
    });
    expect(EncounterTracker).toHaveBeenCalledTimes(1);
    expect(__instances[0].start).toHaveBeenCalledTimes(1);
  });

  it('tracker.onEncounterDetected triggers recordEncounter with myWalkId + theirWalkId', () => {
    const { result } = renderHook(() => useEncounterSession());
    act(() => {
      result.current.start('walk-1');
    });
    __instances[0].callbacks.onEncounterDetected('their-walk', 30000);
    expect(mockRecordMutate).toHaveBeenCalledWith({
      myWalkId: 'walk-1',
      theirWalkId: 'their-walk',
    });
  });

  it('tracker.onEncounterFinalized triggers updateEncounterDuration with seconds', () => {
    const { result } = renderHook(() => useEncounterSession());
    act(() => {
      result.current.start('walk-1');
    });
    __instances[0].callbacks.onEncounterFinalized('their-walk', 125_678);
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      myWalkId: 'walk-1',
      theirWalkId: 'their-walk',
      durationSec: 126,
    });
  });

  it('onDeviceDetected forwards to tracker.onDeviceDetected when started', () => {
    const { result } = renderHook(() => useEncounterSession());
    act(() => {
      result.current.start('walk-1');
    });
    act(() => {
      result.current.onDeviceDetected('their-walk');
    });
    expect(__instances[0].onDeviceDetected).toHaveBeenCalledWith('their-walk');
  });

  it('onDeviceDetected is a no-op when not started', () => {
    const { result } = renderHook(() => useEncounterSession());
    expect(() => result.current.onDeviceDetected('their-walk')).not.toThrow();
  });

  it('stop() stops tracker and clears ref', () => {
    const { result } = renderHook(() => useEncounterSession());
    act(() => {
      result.current.start('walk-1');
    });
    const trackerStop = __instances[0].stop;
    act(() => {
      result.current.stop();
    });
    expect(trackerStop).toHaveBeenCalledTimes(1);
    act(() => {
      result.current.onDeviceDetected('x');
    });
    expect(__instances[0].onDeviceDetected).not.toHaveBeenCalled();
  });
});
