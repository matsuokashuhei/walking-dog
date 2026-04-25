import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useCommitWalkEvent } from './use-commit-walk-event';
import * as walkStore from '@/stores/walk-store';
import type { WalkEvent } from '@/types/graphql';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light' },
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: jest.fn(),
}));

const mockAddEvent = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (walkStore.useWalkStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { addEvent: typeof mockAddEvent }) => unknown) =>
      selector({ addEvent: mockAddEvent }),
  );
});

const sampleEvent: WalkEvent = {
  id: 'event-1',
  walkId: 'walk-1',
  dogId: 'dog-1',
  eventType: 'pee',
  occurredAt: '2026-04-25T08:00:00Z',
  lat: 35.68,
  lng: 139.76,
  photoUrl: null,
};

describe('useCommitWalkEvent', () => {
  it('appends the resolved event to the walk store and fires a light haptic', async () => {
    const { result } = renderHook(() => useCommitWalkEvent());

    let returned: WalkEvent | null = null;
    await act(async () => {
      returned = await result.current(async () => sampleEvent);
    });

    expect(mockAddEvent).toHaveBeenCalledWith(sampleEvent);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(returned).toEqual(sampleEvent);
  });

  it('returns null and skips store + haptic when the producer resolves to null', async () => {
    const { result } = renderHook(() => useCommitWalkEvent());

    let returned: WalkEvent | null = sampleEvent;
    await act(async () => {
      returned = await result.current(async () => null);
    });

    expect(mockAddEvent).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(returned).toBeNull();
  });

  it('propagates rejection without writing to the store or firing haptics', async () => {
    const { result } = renderHook(() => useCommitWalkEvent());

    await act(async () => {
      await expect(
        result.current(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
    });

    expect(mockAddEvent).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
