import { act, renderHook } from '@testing-library/react-native';
import {
  useWalkSession,
  resetWalkSessionTrackingState,
} from './use-walk-session';
import * as walkMutations from './use-walk-mutations';
import * as gpsTracker from '@/lib/walk/gps-tracker';
import * as liveActivity from '@/lib/walk/live-activity';
import { MAX_POINTS_PER_BATCH } from '@/lib/walk/tracking-manager';
import type { LiveActivityState } from '@/stores/walk-store';
import type { WalkPoint } from '@/types/graphql';

jest.mock('./use-walk-mutations', () => ({
  useStartWalk: jest.fn(),
  useFinishWalk: jest.fn(),
  useAddWalkPoints: jest.fn(),
}));

jest.mock('@/lib/walk/gps-tracker', () => ({
  startTracking: jest.fn(),
}));

jest.mock('@/lib/walk/live-activity', () => ({
  startLiveActivity: jest.fn(),
  endLiveActivity: jest.fn(),
  updateLiveActivityDistance: jest.fn(),
  UPDATE_DEBOUNCE_MS: 10_000,
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
let mockStoreLiveActivity: LiveActivityState | null = null;

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
    get liveActivity() {
      return mockStoreLiveActivity;
    },
    setLiveActivity: (activity: LiveActivityState | null) => {
      mockStoreLiveActivity = activity;
    },
    bumpLiveActivityUpdateAt: (at: number) => {
      if (mockStoreLiveActivity) {
        mockStoreLiveActivity = { ...mockStoreLiveActivity, lastUpdateAt: at };
      }
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
  mockStoreStartedAt = new Date('2026-04-01T00:00:00Z');
  mockStorePhase = 'ready';
  mockStoreTrackingGeneration = 0;
  mockStoreTrackingCleanup = null;
  mockStoreLiveActivity = null;

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
  (liveActivity.startLiveActivity as jest.Mock).mockResolvedValue('activity-1');
  (liveActivity.endLiveActivity as jest.Mock).mockResolvedValue(undefined);
  (liveActivity.updateLiveActivityDistance as jest.Mock).mockResolvedValue(undefined);
});

describe('useWalkSession.start', () => {
  it('calls startWalk mutation with dog ids and returns the walk id', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });

    const { result } = renderHook(() => useWalkSession());
    let walkId: string | undefined;
    await act(async () => {
      walkId = await result.current.start({
        selectedDogIds: ['dog-1'],
        liveActivityDogName: 'Rex',
      });
    });

    expect(mockStartWalkMutateAsync).toHaveBeenCalledWith(['dog-1']);
    expect(walkId).toBe('walk-1');
  });

  it('calls startRecording on the walk store with the walk id', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });

    expect(mockStoreStartRecording).toHaveBeenCalledWith('walk-1');
  });

  it('starts live activity with walk id, dog id, dog name, and initial distance 0', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });

    expect(liveActivity.startLiveActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        walkId: 'walk-1',
        dogId: 'dog-1',
        dogName: 'Rex',
        distanceM: 0,
      }),
    );
  });

  it('persists the started Live Activity id (and seeds lastUpdateAt to 0) into the walk store', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    (liveActivity.startLiveActivity as jest.Mock).mockResolvedValue('activity-xyz');

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });

    expect(mockStoreLiveActivity).toEqual({
      activityId: 'activity-xyz',
      startedAt: mockStoreStartedAt,
      lastUpdateAt: 0,
    });
  });

  it('does not seed liveActivity in store when startLiveActivity returns null (unsupported / failed)', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    (liveActivity.startLiveActivity as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });

    expect(mockStoreLiveActivity).toBeNull();
  });

  it('startTracking callback adds point to store without updating Live Activity distance', async () => {
    // distance はサーバ計算に統一したため、useWalkSession 内では Live Activity 更新を行わない。
    // Live Activity の距離更新は walk-recording.tsx のポーリング effect で行う。
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    (liveActivity.startLiveActivity as jest.Mock).mockResolvedValue('activity-1');
    let capturedOnPoint: ((point: WalkPoint) => void) | null = null;
    (gpsTracker.startTracking as jest.Mock).mockImplementation(
      async (cb: (p: WalkPoint) => void) => {
        capturedOnPoint = cb;
        return mockStopTracking;
      },
    );

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });

    const point: WalkPoint = { lat: 35.68, lng: 139.76, recordedAt: '2026-04-01T00:01:00Z' };
    capturedOnPoint!(point);

    expect(mockStoreAddPoint).toHaveBeenCalledWith(point);
    expect(liveActivity.updateLiveActivityDistance).not.toHaveBeenCalled();
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
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockStopTracking).toHaveBeenCalledTimes(1);
  });

  it('stops the active GPS subscription even when stop is called from another hook instance', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });

    const starter = renderHook(() => useWalkSession());
    const stopper = renderHook(() => useWalkSession());

    await act(async () => {
      await starter.result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });
    await act(async () => {
      await stopper.result.current.stop('walk-1');
    });

    expect(mockStopTracking).toHaveBeenCalledTimes(1);
  });

  it('ignores late GPS callbacks after stop begins', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
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
      await starter.result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });
    await act(async () => {
      await stopper.result.current.stop('walk-1');
    });

    mockStoreAddPoint.mockClear();
    (liveActivity.updateLiveActivityDistance as jest.Mock).mockClear();

    const onPoint = requireCapturedOnPoint(capturedOnPoint);
    onPoint({ lat: 35.68, lng: 139.76, recordedAt: '2026-04-01T00:01:00Z' });

    expect(mockStoreAddPoint).not.toHaveBeenCalled();
    expect(liveActivity.updateLiveActivityDistance).not.toHaveBeenCalled();
  });

  it('batches points by MAX_POINTS_PER_BATCH and calls addWalkPoints per batch', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    mockStorePoints = Array.from({ length: MAX_POINTS_PER_BATCH + 50 }, (_, i) => ({
      lat: 35.68,
      lng: 139.76,
      recordedAt: `2026-04-01T00:0${i % 10}:00Z`,
    }));

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
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
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    mockStorePoints = Array.from({ length: MAX_POINTS_PER_BATCH + 50 }, (_, i) => ({
      lat: 35.68,
      lng: 139.76,
      recordedAt: `2026-04-01T00:${String(i % 60).padStart(2, '0')}:00Z`,
    }));

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });
    mockStoreFlushedPointCount = MAX_POINTS_PER_BATCH;
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockAddPointsMutateAsync).toHaveBeenCalledTimes(1);
    const pendingBatch = (mockAddPointsMutateAsync.mock.calls[0][0] as { points: WalkPoint[] }).points;
    expect(pendingBatch).toHaveLength(50);
  });

  it('calls finishWalk with only walkId, ends live activity by id, and clears it from store', async () => {
    // distance はサーバ側で track_point から再計算して保存するため、クライアントから送らない。
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    (liveActivity.startLiveActivity as jest.Mock).mockResolvedValue('activity-7');

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockFinishWalkMutateAsync).toHaveBeenCalledWith({ walkId: 'walk-1' });
    expect(mockStoreFinish).toHaveBeenCalledTimes(1);
    expect(liveActivity.endLiveActivity).toHaveBeenCalledTimes(1);
    expect(liveActivity.endLiveActivity).toHaveBeenCalledWith('activity-7');
    expect(mockStoreLiveActivity).toBeNull();
  });

  it('does not call endLiveActivity when stop runs without an active live activity', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    (liveActivity.startLiveActivity as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(liveActivity.endLiveActivity).not.toHaveBeenCalled();
  });

  it('does not call addWalkPoints when there are no points', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    mockStorePoints = [];

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockAddPointsMutateAsync).not.toHaveBeenCalled();
  });
});
