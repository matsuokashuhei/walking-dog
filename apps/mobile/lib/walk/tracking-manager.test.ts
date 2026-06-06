import type { WalkPoint } from '@/types/graphql';
import { useWalkStore } from '@/stores/walk-store';
import {
  beginWalkTracking,
  flushPendingWalkPoints,
  flushWalkPoints,
  MAX_POINTS_PER_BATCH,
  PERIODIC_FLUSH_INTERVAL_MS,
  resetWalkTrackingState,
  stopWalkTracking,
} from './tracking-manager';

jest.mock('@/lib/walk/gps-tracker', () => ({
  startTracking: jest.fn(),
}));

import { startTracking } from '@/lib/walk/gps-tracker';

function requirePointCallback(
  callback: ((point: WalkPoint) => void) | null,
): (point: WalkPoint) => void {
  if (!callback) {
    throw new Error('Expected GPS callback to be captured');
  }

  return callback;
}

function requireCleanupResolver(
  resolver: ((cleanup: () => void) => void) | null,
): (cleanup: () => void) => void {
  if (!resolver) {
    throw new Error('Expected tracking cleanup resolver to be captured');
  }

  return resolver;
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  useWalkStore.getState().reset();
  resetWalkTrackingState();
});

describe('beginWalkTracking', () => {
  it('forwards points only while the current tracking session is active', async () => {
    useWalkStore.getState().startRecording('walk-1');

    let capturedOnPoint: ((point: WalkPoint) => void) | null = null;
    const stopTracking = jest.fn();
    (startTracking as jest.Mock).mockImplementation(async (onPoint: (point: WalkPoint) => void) => {
      capturedOnPoint = onPoint;
      return stopTracking;
    });

    const onPoint = jest.fn(() => {
      useWalkStore.setState({ totalDistanceM: 42 });
    });
    const onDistanceChange = jest.fn();

    await beginWalkTracking({
      walkId: 'walk-1',
      addWalkPoints: jest.fn().mockResolvedValue(true),
      onPoint,
      onDistanceChange,
      backgroundLocationEnabled: false,
    });

    const point: WalkPoint = { lat: 35.68, lng: 139.76, recordedAt: '2026-04-01T00:01:00Z' };
    const emitPoint = requirePointCallback(capturedOnPoint);
    emitPoint(point);

    expect(onPoint).toHaveBeenCalledWith(point);
    expect(onDistanceChange).toHaveBeenCalledWith(42);

    stopWalkTracking();
    onPoint.mockClear();
    onDistanceChange.mockClear();

    emitPoint(point);

    expect(onPoint).not.toHaveBeenCalled();
    expect(onDistanceChange).not.toHaveBeenCalled();
    expect(stopTracking).toHaveBeenCalledTimes(1);
    expect(startTracking).toHaveBeenCalledWith(expect.any(Function), {
      backgroundLocationEnabled: false,
    });
  });

  it('cleans up an older subscription when a newer session starts before it resolves', async () => {
    useWalkStore.getState().startRecording('walk-1');

    const firstStopTracking = jest.fn();
    const secondStopTracking = jest.fn();
    let resolveFirst: ((value: () => void) => void) | null = null;
    let resolveSecond: ((value: () => void) => void) | null = null;

    (startTracking as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise<() => void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<() => void>((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const addWalkPoints = jest.fn().mockResolvedValue(true);
    const firstStart = beginWalkTracking({
      walkId: 'walk-1',
      addWalkPoints,
      onPoint: jest.fn(),
    });
    const secondStart = beginWalkTracking({
      walkId: 'walk-1',
      addWalkPoints,
      onPoint: jest.fn(),
    });

    requireCleanupResolver(resolveFirst)(firstStopTracking);
    requireCleanupResolver(resolveSecond)(secondStopTracking);

    await firstStart;
    await secondStart;

    expect(firstStopTracking).toHaveBeenCalledTimes(1);

    stopWalkTracking();

    expect(secondStopTracking).toHaveBeenCalledTimes(1);
  });

  it('flushes pending points every 30 seconds and stops when tracking ends', async () => {
    jest.useFakeTimers();
    useWalkStore.getState().startRecording('walk-1');

    const stopTracking = jest.fn();
    const addWalkPoints = jest.fn().mockResolvedValue(true);
    (startTracking as jest.Mock).mockResolvedValue(stopTracking);

    await beginWalkTracking({
      walkId: 'walk-1',
      addWalkPoints,
      onPoint: jest.fn(),
    });

    useWalkStore.getState().addPoint({
      lat: 35.6812,
      lng: 139.7671,
      recordedAt: '2026-04-01T00:00:00Z',
    });

    jest.advanceTimersByTime(PERIODIC_FLUSH_INTERVAL_MS);
    await flushAsyncWork();

    expect(addWalkPoints).toHaveBeenCalledTimes(1);
    expect(useWalkStore.getState().flushedPointCount).toBe(1);

    stopWalkTracking();
    useWalkStore.getState().addPoint({
      lat: 35.6813,
      lng: 139.7672,
      recordedAt: '2026-04-01T00:00:30Z',
    });

    jest.advanceTimersByTime(PERIODIC_FLUSH_INTERVAL_MS);
    await flushAsyncWork();

    expect(addWalkPoints).toHaveBeenCalledTimes(1);
    expect(stopTracking).toHaveBeenCalledTimes(1);
  });

  it('catches and logs periodic flush failures so tracking keeps running', async () => {
    jest.useFakeTimers();
    useWalkStore.getState().startRecording('walk-1');

    const stopTracking = jest.fn();
    const addWalkPoints = jest.fn().mockRejectedValue(new Error('network down'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (startTracking as jest.Mock).mockResolvedValue(stopTracking);

    await beginWalkTracking({
      walkId: 'walk-1',
      addWalkPoints,
      onPoint: jest.fn(),
    });

    useWalkStore.getState().addPoint({
      lat: 35.6812,
      lng: 139.7671,
      recordedAt: '2026-04-01T00:00:00Z',
    });

    await jest.advanceTimersByTimeAsync(PERIODIC_FLUSH_INTERVAL_MS);

    expect(addWalkPoints).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to flush walk points during active tracking',
      expect.any(Error),
    );
    expect(useWalkStore.getState().flushedPointCount).toBe(0);

    consoleErrorSpy.mockRestore();
  });
});

describe('flushPendingWalkPoints', () => {
  it('flushes only the unflushed suffix and advances the cursor', async () => {
    useWalkStore.getState().startRecording('walk-1');
    const points: WalkPoint[] = [
      { lat: 35.6812, lng: 139.7671, recordedAt: '2026-04-01T00:00:00Z' },
      { lat: 35.6813, lng: 139.7672, recordedAt: '2026-04-01T00:00:05Z' },
      { lat: 35.6814, lng: 139.7673, recordedAt: '2026-04-01T00:00:10Z' },
    ];
    points.forEach((point) => useWalkStore.getState().addPoint(point));
    useWalkStore.getState().markFlushedPointCount(1);

    const addWalkPoints = jest.fn().mockResolvedValue(true);

    await flushPendingWalkPoints({ walkId: 'walk-1', addWalkPoints });

    expect(addWalkPoints).toHaveBeenCalledTimes(1);
    expect(addWalkPoints.mock.calls[0][0].points).toEqual(points.slice(1));
    expect(useWalkStore.getState().flushedPointCount).toBe(3);
  });

  it('keeps progress from successful batches when a later batch fails', async () => {
    useWalkStore.getState().startRecording('walk-1');
    const points: WalkPoint[] = Array.from({ length: MAX_POINTS_PER_BATCH + 50 }, (_, index) => ({
      lat: 35.68 + index * 0.00001,
      lng: 139.76 + index * 0.00001,
      recordedAt: new Date(Date.parse('2026-04-01T00:00:00Z') + index * 1000).toISOString(),
    }));
    points.forEach((point) => useWalkStore.getState().addPoint(point));

    const addWalkPoints = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('network down'));

    await expect(flushPendingWalkPoints({ walkId: 'walk-1', addWalkPoints })).rejects.toThrow(
      'network down',
    );
    expect(useWalkStore.getState().flushedPointCount).toBe(MAX_POINTS_PER_BATCH);

    addWalkPoints.mockReset().mockResolvedValue(true);

    await flushPendingWalkPoints({ walkId: 'walk-1', addWalkPoints });

    expect(addWalkPoints).toHaveBeenCalledTimes(1);
    expect(addWalkPoints.mock.calls[0][0].points).toHaveLength(50);
    expect(useWalkStore.getState().flushedPointCount).toBe(MAX_POINTS_PER_BATCH + 50);
  });
});

describe('flushWalkPoints', () => {
  it('batches walk points with MAX_POINTS_PER_BATCH', async () => {
    const addWalkPoints = jest.fn().mockResolvedValue(true);
    const points: WalkPoint[] = Array.from({ length: MAX_POINTS_PER_BATCH + 50 }, (_, index) => ({
      lat: 35.68,
      lng: 139.76,
      recordedAt: `2026-04-01T00:${String(index % 60).padStart(2, '0')}:00Z`,
    }));

    await flushWalkPoints({ walkId: 'walk-1', points, addWalkPoints });

    expect(addWalkPoints).toHaveBeenCalledTimes(2);
    expect(addWalkPoints.mock.calls[0][0]).toEqual(
      expect.objectContaining({ points: expect.arrayContaining(points.slice(0, MAX_POINTS_PER_BATCH)) }),
    );
    expect(addWalkPoints.mock.calls[0][0].points).toHaveLength(MAX_POINTS_PER_BATCH);
    expect(addWalkPoints.mock.calls[1][0].points).toHaveLength(50);
  });
});
