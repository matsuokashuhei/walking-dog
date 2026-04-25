import type { WalkPoint } from '@/types/graphql';
import { useWalkStore } from '@/stores/walk-store';
import {
  beginWalkTracking,
  flushWalkPoints,
  MAX_POINTS_PER_BATCH,
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

beforeEach(() => {
  jest.clearAllMocks();
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

    await beginWalkTracking({ onPoint, onDistanceChange });

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

    const firstStart = beginWalkTracking({ onPoint: jest.fn() });
    const secondStart = beginWalkTracking({ onPoint: jest.fn() });

    requireCleanupResolver(resolveFirst)(firstStopTracking);
    requireCleanupResolver(resolveSecond)(secondStopTracking);

    await firstStart;
    await secondStart;

    expect(firstStopTracking).toHaveBeenCalledTimes(1);

    stopWalkTracking();

    expect(secondStopTracking).toHaveBeenCalledTimes(1);
  });
});

describe('flushWalkPoints', () => {
  it('batches walk points with MAX_POINTS_PER_BATCH', async () => {
    const addWalkPoints = jest.fn().mockResolvedValue(true);
    const markUploadedPointCount = jest.fn();
    const points: WalkPoint[] = Array.from({ length: MAX_POINTS_PER_BATCH + 50 }, (_, index) => ({
      lat: 35.68,
      lng: 139.76,
      recordedAt: `2026-04-01T00:${String(index % 60).padStart(2, '0')}:00Z`,
    }));

    await flushWalkPoints({
      walkId: 'walk-1',
      points,
      uploadedPointCount: 0,
      addWalkPoints,
      markUploadedPointCount,
    });

    expect(addWalkPoints).toHaveBeenCalledTimes(2);
    expect(markUploadedPointCount).toHaveBeenNthCalledWith(1, MAX_POINTS_PER_BATCH);
    expect(markUploadedPointCount).toHaveBeenNthCalledWith(2, MAX_POINTS_PER_BATCH + 50);
    expect(addWalkPoints.mock.calls[0][0]).toEqual(
      expect.objectContaining({ points: expect.arrayContaining(points.slice(0, MAX_POINTS_PER_BATCH)) }),
    );
    expect(addWalkPoints.mock.calls[0][0].points).toHaveLength(MAX_POINTS_PER_BATCH);
    expect(addWalkPoints.mock.calls[1][0].points).toHaveLength(50);
  });
});
