import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useFlushWalkEventOutbox } from './use-flush-walk-event-outbox';
import * as outbox from '@/lib/walk/event-outbox';
import * as walkStore from '@/stores/walk-store';
import * as walkEventMutations from './use-walk-event-mutations';
import type { PendingWalkEvent } from '@/lib/walk/event-outbox';
import type { WalkEvent } from '@/types/graphql';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light' },
}));

jest.mock('@/lib/walk/event-outbox', () => ({
  listPendingEvents: jest.fn(),
  removePendingEvent: jest.fn(),
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: jest.fn(),
}));

jest.mock('./use-walk-event-mutations', () => ({
  useRecordWalkEvent: jest.fn(),
}));

const mockMutateAsync = jest.fn();
const mockAddEvent = jest.fn();

const pendingPee: PendingWalkEvent = {
  id: 'evt_1',
  walkId: 'walk-1',
  dogId: 'dog-1',
  eventType: 'pee',
  clientRequestId: 'watch-command-1',
  occurredAt: '2026-04-25T08:30:00.000Z',
  lat: 35.68,
  lng: 139.76,
  queuedAt: '2026-04-25T08:30:00.500Z',
};

const pendingPoo: PendingWalkEvent = {
  id: 'evt_2',
  walkId: 'walk-1',
  eventType: 'poo',
  occurredAt: '2026-04-25T08:31:00.000Z',
  queuedAt: '2026-04-25T08:31:00.500Z',
};

const replayedPee: WalkEvent = {
  id: 'server-1',
  walkId: 'walk-1',
  dogId: 'dog-1',
  eventType: 'pee',
  occurredAt: '2026-04-25T08:30:00.000Z',
  lat: 35.68,
  lng: 139.76,
  photoUrl: null,
};

const replayedPoo: WalkEvent = {
  id: 'server-2',
  walkId: 'walk-1',
  dogId: null,
  eventType: 'poo',
  occurredAt: '2026-04-25T08:31:00.000Z',
  lat: null,
  lng: null,
  photoUrl: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (walkEventMutations.useRecordWalkEvent as jest.Mock).mockReturnValue({
    mutateAsync: mockMutateAsync,
  });
  (walkStore.useWalkStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { addEvent: typeof mockAddEvent }) => unknown) =>
      selector({ addEvent: mockAddEvent }),
  );
});

describe('useFlushWalkEventOutbox', () => {
  it('returns 0/0 when the outbox is empty', async () => {
    (outbox.listPendingEvents as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useFlushWalkEventOutbox());
    let outcome: { flushed: number; remaining: number } | undefined;
    await act(async () => {
      outcome = await result.current();
    });

    expect(outcome).toEqual({ flushed: 0, remaining: 0 });
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(outbox.removePendingEvent).not.toHaveBeenCalled();
  });

  it('replays each pending event, adds it to the store, fires a haptic, and removes it from the outbox', async () => {
    (outbox.listPendingEvents as jest.Mock).mockResolvedValue([pendingPee, pendingPoo]);
    mockMutateAsync.mockResolvedValueOnce(replayedPee).mockResolvedValueOnce(replayedPoo);

    const { result } = renderHook(() => useFlushWalkEventOutbox());
    let outcome: { flushed: number; remaining: number } | undefined;
    await act(async () => {
      outcome = await result.current();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        walkId: 'walk-1',
        dogId: 'dog-1',
        eventType: 'pee',
        clientRequestId: 'watch-command-1',
        lat: 35.68,
        lng: 139.76,
      }),
    );
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'poo', occurredAt: '2026-04-25T08:31:00.000Z' }),
    );
    expect(mockAddEvent).toHaveBeenNthCalledWith(1, replayedPee);
    expect(mockAddEvent).toHaveBeenNthCalledWith(2, replayedPoo);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    expect(outbox.removePendingEvent).toHaveBeenCalledWith('evt_1');
    expect(outbox.removePendingEvent).toHaveBeenCalledWith('evt_2');
    expect(outcome).toEqual({ flushed: 2, remaining: 0 });
  });

  it('stops on the first failure and leaves remaining items in the outbox', async () => {
    (outbox.listPendingEvents as jest.Mock).mockResolvedValue([pendingPee, pendingPoo]);
    mockMutateAsync
      .mockResolvedValueOnce(replayedPee)
      .mockRejectedValueOnce(new Error('still offline'));

    const { result } = renderHook(() => useFlushWalkEventOutbox());
    let outcome: { flushed: number; remaining: number } | undefined;
    await act(async () => {
      outcome = await result.current();
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    expect(mockAddEvent).toHaveBeenCalledTimes(1);
    expect(outbox.removePendingEvent).toHaveBeenCalledTimes(1);
    expect(outbox.removePendingEvent).toHaveBeenCalledWith('evt_1');
    expect(outcome).toEqual({ flushed: 1, remaining: 1 });
  });

  it('omits lat/lng from the replayed mutation when the queued event had no GPS fix', async () => {
    (outbox.listPendingEvents as jest.Mock).mockResolvedValue([pendingPoo]);
    mockMutateAsync.mockResolvedValueOnce(replayedPoo);

    const { result } = renderHook(() => useFlushWalkEventOutbox());
    await act(async () => {
      await result.current();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({ lat: expect.anything(), lng: expect.anything() }),
    );
  });
});
