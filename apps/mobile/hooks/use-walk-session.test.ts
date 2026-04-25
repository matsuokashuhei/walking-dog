import { act, renderHook } from '@testing-library/react-native';
import {
  useWalkSession,
  MAX_POINTS_PER_BATCH,
  resetWalkSessionTrackingState,
} from './use-walk-session';
import * as walkMutations from './use-walk-mutations';
import * as gpsTracker from '@/lib/walk/gps-tracker';
import * as liveActivity from '@/lib/walk/live-activity';
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
const mockStoreAbortRecordingStart = jest.fn();
const mockStoreAddPoint = jest.fn();
const mockStoreFinish = jest.fn();
const mockStoreResumePausedWalk = jest.fn();
const mockStoreTogglePaused = jest.fn();
let mockStorePoints: WalkPoint[] = [];
let mockStoreUploadedPointCount = 0;
let mockStoreTotalDistanceM = 0;
let mockStoreStartedAt: Date | null = null;
let mockStorePhase: 'ready' | 'recording' | 'finished' = 'ready';
let mockStoreIsPaused = false;
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
      mockStoreIsPaused = false;
      mockStoreUploadedPointCount = 0;
      return mockStoreStartRecording(...args);
    },
    abortRecordingStart: () => {
      mockStorePhase = 'ready';
      mockStoreIsPaused = false;
      mockStoreUploadedPointCount = 0;
      mockStoreLiveActivity = null;
      return mockStoreAbortRecordingStart();
    },
    addPoint: (...args: unknown[]) => mockStoreAddPoint(...args),
    finish: (...args: unknown[]) => {
      mockStorePhase = 'finished';
      mockStoreIsPaused = false;
      return mockStoreFinish(...args);
    },
    resumePausedWalk: () => mockStoreResumePausedWalk(),
    togglePaused: () => {
      mockStoreIsPaused = !mockStoreIsPaused;
      return mockStoreTogglePaused();
    },
    markUploadedPointCount: (count: number) => {
      mockStoreUploadedPointCount = Math.max(mockStoreUploadedPointCount, count);
    },
    get points() {
      return mockStorePoints;
    },
    get uploadedPointCount() {
      return mockStoreUploadedPointCount;
    },
    get totalDistanceM() {
      return mockStoreTotalDistanceM;
    },
    get startedAt() {
      return mockStoreStartedAt;
    },
    get isPaused() {
      return mockStoreIsPaused;
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
  mockStoreAbortRecordingStart.mockClear();
  mockStoreResumePausedWalk.mockClear();
  mockStoreTogglePaused.mockClear();
  mockStorePoints = [];
  mockStoreUploadedPointCount = 0;
  mockStoreTotalDistanceM = 0;
  mockStoreStartedAt = new Date('2026-04-01T00:00:00Z');
  mockStorePhase = 'ready';
  mockStoreIsPaused = false;
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

  it('startTracking callback adds point to store and updates live activity distance with the stored activity id', async () => {
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
    mockStoreTotalDistanceM = 42;
    capturedOnPoint!(point);

    expect(mockStoreAddPoint).toHaveBeenCalledWith(point);
    expect(liveActivity.updateLiveActivityDistance).toHaveBeenCalledWith('activity-1', 42);
  });

  it('debounces consecutive distance updates within UPDATE_DEBOUNCE_MS', async () => {
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
    mockStoreTotalDistanceM = 10;
    capturedOnPoint!(point);
    mockStoreTotalDistanceM = 20;
    capturedOnPoint!(point);

    expect(liveActivity.updateLiveActivityDistance).toHaveBeenCalledTimes(1);
    expect(liveActivity.updateLiveActivityDistance).toHaveBeenCalledWith('activity-1', 10);
  });

  it('skips Live Activity updates entirely when no activity was started', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    (liveActivity.startLiveActivity as jest.Mock).mockResolvedValue(null);
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

    mockStoreTotalDistanceM = 42;
    capturedOnPoint!({ lat: 35.68, lng: 139.76, recordedAt: '2026-04-01T00:01:00Z' });

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

  it('rolls back the recording state if tracking startup fails after the walk is created', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    (gpsTracker.startTracking as jest.Mock).mockRejectedValue(new Error('gps failed'));

    const { result } = renderHook(() => useWalkSession());

    await expect(
      result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' }),
    ).rejects.toThrow('gps failed');

    expect(mockStoreAbortRecordingStart).toHaveBeenCalledTimes(1);
    expect(liveActivity.endLiveActivity).toHaveBeenCalledWith('activity-1');
    expect(mockStorePhase).toBe('ready');
    expect(mockStoreLiveActivity).toBeNull();
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
    expect(mockStoreTogglePaused).toHaveBeenCalledTimes(1);
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
    expect(mockStoreTogglePaused).toHaveBeenCalledTimes(1);
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

  it('calls finishWalk with rounded distance, ends live activity by id, and clears it from store', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    (liveActivity.startLiveActivity as jest.Mock).mockResolvedValue('activity-7');
    mockStoreTotalDistanceM = 1234.7;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-21T09:15:30.000Z'));

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });
    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockFinishWalkMutateAsync).toHaveBeenCalledWith({ walkId: 'walk-1', distanceM: 1235 });
    expect(mockStoreFinish).toHaveBeenCalledTimes(1);
    expect(mockStoreFinish).toHaveBeenCalledWith(new Date('2026-04-21T09:15:30.000Z'));
  expect(mockStoreTogglePaused).toHaveBeenCalledTimes(1);
    expect(liveActivity.endLiveActivity).toHaveBeenCalledTimes(1);
    expect(liveActivity.endLiveActivity).toHaveBeenCalledWith('activity-7');
    expect(mockStoreLiveActivity).toBeNull();

    jest.useRealTimers();
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

  it('keeps the walk locally recoverable if stop persistence fails', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    mockAddPointsMutateAsync.mockRejectedValue(new Error('flush failed'));
    mockStorePoints = [{ lat: 35.68, lng: 139.76, recordedAt: '2026-04-01T00:01:00Z' }];

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });

    await expect(result.current.stop('walk-1')).rejects.toThrow('flush failed');

    expect(mockStorePhase).toBe('recording');
    expect(mockStopTracking).not.toHaveBeenCalled();
    expect(mockStoreFinish).not.toHaveBeenCalled();
    expect(liveActivity.endLiveActivity).not.toHaveBeenCalled();
    expect(mockStoreTogglePaused).toHaveBeenCalledTimes(2);
  });

  it('does not re-upload points that already flushed before a retry', async () => {
    mockStartWalkMutateAsync.mockResolvedValue({ id: 'walk-1' });
    mockStorePoints = Array.from({ length: MAX_POINTS_PER_BATCH + 1 }, (_, index) => ({
      lat: 35.68,
      lng: 139.76,
      recordedAt: `2026-04-01T00:${String(index).padStart(2, '0')}:00Z`,
    }));
    mockAddPointsMutateAsync
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('second batch failed'))
      .mockResolvedValueOnce(true);

    const { result } = renderHook(() => useWalkSession());
    await act(async () => {
      await result.current.start({ selectedDogIds: ['dog-1'], liveActivityDogName: 'Rex' });
    });

    await expect(result.current.stop('walk-1')).rejects.toThrow('second batch failed');
    expect(mockStoreUploadedPointCount).toBe(MAX_POINTS_PER_BATCH);

    mockAddPointsMutateAsync.mockClear();

    await act(async () => {
      await result.current.stop('walk-1');
    });

    expect(mockAddPointsMutateAsync).toHaveBeenCalledTimes(1);
    expect((mockAddPointsMutateAsync.mock.calls[0][0] as { points: WalkPoint[] }).points).toHaveLength(1);
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
