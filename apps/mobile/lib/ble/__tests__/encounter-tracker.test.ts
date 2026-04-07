import { EncounterTracker, EncounterCallbacks } from '../encounter-tracker';

// Mock timers for deterministic testing
jest.useFakeTimers();

function createMockCallbacks(): EncounterCallbacks & {
  detected: Array<{ walkId: string; durationMs: number }>;
  finalized: Array<{ walkId: string; durationMs: number }>;
} {
  const detected: Array<{ walkId: string; durationMs: number }> = [];
  const finalized: Array<{ walkId: string; durationMs: number }> = [];
  return {
    detected,
    finalized,
    onEncounterDetected: (walkId, durationMs) => detected.push({ walkId, durationMs }),
    onEncounterFinalized: (walkId, durationMs) => finalized.push({ walkId, durationMs }),
  };
}

describe('EncounterTracker', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('does not report encounter before 30s threshold', () => {
    const callbacks = createMockCallbacks();
    const tracker = new EncounterTracker(callbacks);

    tracker.onDeviceDetected('walk-123');
    jest.advanceTimersByTime(20_000);
    tracker.onDeviceDetected('walk-123');

    expect(callbacks.detected).toHaveLength(0);
    tracker.stop();
  });

  it('reports encounter after 30s continuous detection', () => {
    const callbacks = createMockCallbacks();
    const tracker = new EncounterTracker(callbacks);

    const start = Date.now();
    tracker.onDeviceDetected('walk-123');

    // Simulate periodic detections over 31 seconds
    jest.advanceTimersByTime(10_000);
    tracker.onDeviceDetected('walk-123');
    jest.advanceTimersByTime(10_000);
    tracker.onDeviceDetected('walk-123');
    jest.advanceTimersByTime(11_000);
    tracker.onDeviceDetected('walk-123');

    expect(callbacks.detected).toHaveLength(1);
    expect(callbacks.detected[0].walkId).toBe('walk-123');
    expect(callbacks.detected[0].durationMs).toBeGreaterThanOrEqual(30_000);

    tracker.stop();
  });

  it('reports encounter only once for same walk ID', () => {
    const callbacks = createMockCallbacks();
    const tracker = new EncounterTracker(callbacks);

    tracker.onDeviceDetected('walk-123');
    jest.advanceTimersByTime(31_000);
    tracker.onDeviceDetected('walk-123');
    jest.advanceTimersByTime(10_000);
    tracker.onDeviceDetected('walk-123');

    expect(callbacks.detected).toHaveLength(1);
    tracker.stop();
  });

  it('tracks multiple walk IDs independently', () => {
    const callbacks = createMockCallbacks();
    const tracker = new EncounterTracker(callbacks);

    tracker.onDeviceDetected('walk-A');
    jest.advanceTimersByTime(15_000);
    tracker.onDeviceDetected('walk-B');
    jest.advanceTimersByTime(16_000);
    tracker.onDeviceDetected('walk-A'); // 31s since first A
    tracker.onDeviceDetected('walk-B'); // 16s since first B, not yet

    expect(callbacks.detected).toHaveLength(1);
    expect(callbacks.detected[0].walkId).toBe('walk-A');

    jest.advanceTimersByTime(15_000);
    tracker.onDeviceDetected('walk-B'); // 31s since first B

    expect(callbacks.detected).toHaveLength(2);
    expect(callbacks.detected[1].walkId).toBe('walk-B');

    tracker.stop();
  });

  it('finalizes reported encounters on stop', () => {
    const callbacks = createMockCallbacks();
    const tracker = new EncounterTracker(callbacks);

    tracker.onDeviceDetected('walk-123');
    jest.advanceTimersByTime(31_000);
    tracker.onDeviceDetected('walk-123'); // triggers report

    jest.advanceTimersByTime(10_000);
    tracker.onDeviceDetected('walk-123'); // extend duration

    tracker.stop();

    expect(callbacks.finalized).toHaveLength(1);
    expect(callbacks.finalized[0].walkId).toBe('walk-123');
    expect(callbacks.finalized[0].durationMs).toBeGreaterThanOrEqual(40_000);
  });

  it('does not finalize unreported encounters on stop', () => {
    const callbacks = createMockCallbacks();
    const tracker = new EncounterTracker(callbacks);

    tracker.onDeviceDetected('walk-123');
    jest.advanceTimersByTime(10_000); // only 10s, not reported yet

    tracker.stop();

    expect(callbacks.finalized).toHaveLength(0);
  });

  it('cleans up stale entries after 60s without signal', () => {
    const callbacks = createMockCallbacks();
    const tracker = new EncounterTracker(callbacks);
    tracker.start();

    tracker.onDeviceDetected('walk-123');
    jest.advanceTimersByTime(31_000);
    tracker.onDeviceDetected('walk-123'); // triggers report

    // No more signals for 70s → should trigger cleanup + finalize
    jest.advanceTimersByTime(70_000);

    expect(callbacks.finalized).toHaveLength(1);
    expect(tracker.pendingCount).toBe(0);

    tracker.stop();
  });
});
