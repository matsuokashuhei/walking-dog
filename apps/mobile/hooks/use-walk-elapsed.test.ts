import { act, renderHook } from '@testing-library/react-native';
import { useWalkElapsed } from './use-walk-elapsed';

const FIXED_NOW = new Date('2026-04-20T10:00:00.000Z');

describe('useWalkElapsed', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 0 when no walk has started yet', () => {
    const { result } = renderHook(() => useWalkElapsed({ startedAt: null }));

    act(() => {
      jest.advanceTimersByTime(3_000);
    });

    expect(result.current).toBe(0);
  });

  it('ticks every second from the walk start time', () => {
    const startedAt = new Date('2026-04-20T09:59:55.000Z');
    const { result } = renderHook(() => useWalkElapsed({ startedAt }));

    expect(result.current).toBe(5);

    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    expect(result.current).toBe(7);
  });
});
