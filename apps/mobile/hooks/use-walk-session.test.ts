import { act, renderHook } from '@testing-library/react-native';
import {
  useWalkSession,
  resetWalkSessionTrackingState,
} from './use-walk-session';
import * as walkMutations from './use-walk-mutations';
import * as gpsTracker from '@/lib/walk/gps-tracker';
import * as liveActivityController from '@/lib/walk/live-activity-controller';
import { MAX_POINTS_PER_BATCH } from '@/lib/walk/tracking-manager';
import type { Dog, WalkPoint } from '@/types/graphql';

jest.mock('./use-walk-mutations', () => ({
  useStartWalk: jest.fn(),
  useFinishWalk: jest.fn(),
  useAddWalkPoints: jest.fn(),
}));

jest.mock('@/lib/walk/gps-tracker', () => ({
  startTracking: jest.fn(),
}));

jest.mock('@/lib/walk/live-activity-controller', () => ({
  startWalkLiveActivity: jest.fn(),
  endWalkLiveActivity: jest.fn(),
}));

const mockStoreStartRecording = jest.fn();
const mockStoreAddPoint = jest.fn();
const mockStoreFinish = jest.fn();
let mockStorePoints: WalkPoint[] = [];
let mockStoreFlushedPointCount = 0;
let mockStoreTotalDistanceM = 0;
let mockStoreStartedAt: Date | null = null;
let mockStorePhase: 'ready' | 'recording' | 'finished' = 'ready';
let mockStoreTrackingGeneration = 0;
let mockStoreTrackingCleanup: (() => void) | null = null;

jest.mock('@/stores/walk-store', () => {
  const state = {
    get phase() {
      return mockStorePhase;
    },
    startRecording: (...args: unknown[]) => {
      mockStorePhase = 'recording';
      mockStoreFlushedPointCount = 0;
      return mockStoreStartRecording(...args);
    },
    addPoint: (...args: unknown[]) => mockStoreAddPoint(...args),
    markFlushedPointCount: (count: number) => {
      mockStoreFlushedPointCount = Math.max(mockStoreFlushedPointCount, count);
    },
    finish: () => {
      mockStorePhase = 'finished';
      return mockStoreFinish();
    },
    get points() {
      return mockStorePoints;
    },
    get flushedPointCount() {
      return mockStoreFlushedPointCount;
    },
    get totalDistanceM() {
      return mockStoreTotalDistanceM;
    },
    get startedAt() {
      return mockStoreStartedAt;
    },
    get trackingGeneration() {
      return mockStoreTrackingGeneration;
    },
    get trackingCleanup() {
      return mockStoreTrackingCleanup;
    },
    activateTrackingSession: () => {
      mockStoreTrackingGeneration += 1;
      const cleanup = mockStoreTrackingCleanup;
      mockStoreTrackingCleanup = null;
      cleanup?.();
      return mockStoreTrackingGeneration;
    },
    attachTrackingCleanup: (generation: number, cleanup: () => void) => {
      if (generation !== mockStoreTrackingGeneration) {
        return false;
      }

      mockStoreTrackingCleanup = cleanup;
      return true;
    },
    stopTrackingSession: () => {
      mockStoreTrackingGeneration += 1;
      const cleanup = mockStoreTrackingCleanup;
      mockStoreTrackingCleanup = null;
      cleanup?.();
    },
    resetTrackingSession: () => {
      const cleanup = mockStoreTrackingCleanup;
      mockStoreTrackingCleanup = null;
      mockStoreTrackingGeneration = 0;
      cleanup?.();
    },
  };
  const useWalkStoreMock = (selector: (s: typeof state) => unknown) => selector(state);
  (useWalkStoreMock as unknown as { getState: () => typeof state }).getState = () => state;
  return { useWalkStore: useWalkStoreMock };
});

const mockStartWalkMutateAsync = jest.fn();
const mockFinishWalkMutateAsync = jest.fn();
const mockAddPointsMutateAsync = jest.fn();
const mockStopTracking = jest.fn();
const startedAtIso = '2026-04-01T00:00:00Z';
const dog: Dog = {
  id: 'dog-1',
  name: 'Mugi',
  breed: null,
  gender: 'OTHER',
  createdAt: '2026-04-01T00:00:00Z',
};
const startedWalk = {
  id: 'walk-1',
  dogs: [dog],
  status: 'ACTIVE' as const,
  startedAt: startedAtIso,
  endedAt: null,
  distance: 0,
  distanceM: 0,
};

function requireCapturedOnPoint(
  callback: ((point: WalkPoint) => void) | null,
): (point: WalkPoint) => void {
  if (!callback) {
    throw new Error('Expected GPS callback to be captured');
  }
  return callback;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetWalkSessionTrackingState();
  mockStorePoints = [];
  mockStoreFlushedPointCount = 0;
  mockStoreTotalDistanceM = 0;
  mockStoreStartedAt = new Date(startedAtIso);
  mockStorePhase = 'ready';
  mockStoreTrackingGeneration = 0;
  mockStoreTrackingCleanup = null;

  (walkMutations.useStartWalk as jest.Mock).mockReturnValue({
    mutateAsync: mockStartWalkMutateAsync,
    isPending: false,
  });
  (walkMutations.useFinishWalk as jest.Mock).mockReturnValue({
    mutateAsync: mockFinishWalkMutateAsync,
  });
  (walkMutations.useAddWalkPoints as jest.Mock).mockReturnValue({
    mutateAsync: mockAddPointsMutateAsync,
  });
  (gpsTracker.startTracking as jest.Mock).mockResolvedValue(mockStopTracking);
});

describe('useWalkSession.start', () => {
  it('calls startWalk mutation with dog ids and returns the walk id', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);

    const { result } = renderHook(() => useWalkSession());
    let walkId: string | undefined;
    await act(async () => {
      walkId = await result.current.start({
        selectedDogIds: ['dog-1'],
      });
    });

    expect(mockStartWalkMutateAsync).toHaveBeenCalledWith(['dog-1']);
    expect(walkId).toBe('walk-1');
  });

  it('calls startRecording on the walk store with the walk id', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });

    expect(mockStoreStartRecording).toHaveBeenCalledWith('walk-1');
  });

  it('starts the lock screen live activity with current walk data', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });

    expect(liveActivityController.startWalkLiveActivity).toHaveBeenCalledWith({
      walkId: 'walk-1',
      startedAtMs: Date.parse(startedAtIso),
      distanceLabel: '0 m',
      dogs: [
        {
          id: 'dog-1',
          name: 'Mugi',
          peeCount: 0,
          pooCount: 0,
          peeTarget: 'walk:pee:dog-1',
          pooTarget: 'walk:poo:dog-1',
        },
      ],
      finishTarget: 'walk:finish',
    });
  });

  it('startTracking callback adds point to store', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);
    let capturedOnPoint: ((point: WalkPoint) => void) | null = null;
    (gpsTracker.startTracking as jest.Mock).mockImplementation(
      async (cb: (p: WalkPoint) => void) => {
        capturedOnPoint = cb;
        return mockStopTracking;
      },
    );

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });

    const point: WalkPoint = { lat: 35.68, lng: 139.76, recordedAt: '2026-04-01T00:01:00Z' };
    capturedOnPoint!(point);

    expect(mockStoreAddPoint).toHaveBeenCalledWith(point);
  });

  it('exposes isStarting from startWalk mutation', () => {
    (walkMutations.useStartWalk as jest.Mock).mockReturnValue({
      mutateAsync: mockStartWalkMutateAsync,
      isPending: true,
    });

    const { result } = renderHook(() => useWalkSession());
    expect(result.current.isStarting).toBe(true);
  });
});

describe('useWalkSession.stop', () => {
  it('calls the stopTracking function returned by startTracking', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockStopTracking).toHaveBeenCalledTimes(1);
  });

  it('stops the active GPS subscription even when stop is called from another hook instance', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);

    const starter = renderHook(() => useWalkSession());
    const stopper = renderHook(() => useWalkSession());

    await act(async () => {
      await starter.result.current.start({ selectedDogIds: ['dog-1'] });
    });
    await act(async () => {
      await stopper.result.current.stop('walk-1');
    });

    expect(mockStopTracking).toHaveBeenCalledTimes(1);
  });

  it('ignores late GPS callbacks after stop begins', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);
    let capturedOnPoint: ((point: WalkPoint) => void) | null = null;
    (gpsTracker.startTracking as jest.Mock).mockImplementation(
      async (cb: (p: WalkPoint) => void) => {
        capturedOnPoint = cb;
        return mockStopTracking;
      },
    );

    const starter = renderHook(() => useWalkSession());
    const stopper = renderHook(() => useWalkSession());

    await act(async () => {
      await starter.result.current.start({ selectedDogIds: ['dog-1'] });
    });
    await act(async () => {
      await stopper.result.current.stop('walk-1');
    });

    mockStoreAddPoint.mockClear();
    const onPoint = requireCapturedOnPoint(capturedOnPoint);
    onPoint({ lat: 35.68, lng: 139.76, recordedAt: '2026-04-01T00:01:00Z' });

    expect(mockStoreAddPoint).not.toHaveBeenCalled();
  });

  it('batches points by MAX_POINTS_PER_BATCH and calls addWalkPoints per batch', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);
    mockStorePoints = Array.from({ length: MAX_POINTS_PER_BATCH + 50 }, (_, i) => ({
      lat: 35.68,
      lng: 139.76,
      recordedAt: `2026-04-01T00:0${i % 10}:00Z`,
    }));

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockAddPointsMutateAsync).toHaveBeenCalledTimes(2);
    const firstBatch = (mockAddPointsMutateAsync.mock.calls[0][0] as { points: WalkPoint[] }).points;
    expect(firstBatch).toHaveLength(MAX_POINTS_PER_BATCH);
    const secondBatch = (mockAddPointsMutateAsync.mock.calls[1][0] as { points: WalkPoint[] }).points;
    expect(secondBatch).toHaveLength(50);
  });

  it('only flushes points that have not already been sent when stop runs', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);
    mockStorePoints = Array.from({ length: MAX_POINTS_PER_BATCH + 50 }, (_, i) => ({
      lat: 35.68,
      lng: 139.76,
      recordedAt: `2026-04-01T00:${String(i % 60).padStart(2, '0')}:00Z`,
    }));

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });
    mockStoreFlushedPointCount = MAX_POINTS_PER_BATCH;
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockAddPointsMutateAsync).toHaveBeenCalledTimes(1);
    const pendingBatch = (mockAddPointsMutateAsync.mock.calls[0][0] as { points: WalkPoint[] }).points;
    expect(pendingBatch).toHaveLength(50);
  });

  it('calls finishWalk with only walkId and finishes the store', async () => {
    // distance はサーバ側で track_point から再計算して保存するため、クライアントから送らない。
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockFinishWalkMutateAsync).toHaveBeenCalledWith({ walkId: 'walk-1' });
    expect(mockStoreFinish).toHaveBeenCalledTimes(1);
    expect(liveActivityController.endWalkLiveActivity).toHaveBeenCalledTimes(1);
  });

  it('does not fail saved walk completion when ending the live activity fails', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);
    (liveActivityController.endWalkLiveActivity as jest.Mock).mockRejectedValue(
      new Error('Live Activity failed'),
    );
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockFinishWalkMutateAsync).toHaveBeenCalledWith({ walkId: 'walk-1' });
    expect(mockStoreFinish).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[walk.liveActivity.end] failed after walk was saved',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it('does not call addWalkPoints when there are no points', async () => {
    mockStartWalkMutateAsync.mockResolvedValue(startedWalk);
    mockStorePoints = [];

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'] });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockAddPointsMutateAsync).not.toHaveBeenCalled();
  });
});
