import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useWatchWalkCommandProcessor } from './use-watch-walk-command-processor';
import { addCommandListener, ackCommand, getPendingCommands } from '@/lib/watch/bridge';
import { useWalkStore } from '@/stores/walk-store';

const mockRemoveSubscription = jest.fn();
const mockRecordEvent = jest.fn();
const mockStopWalk = jest.fn();

jest.mock('@/lib/watch/bridge', () => ({
  addCommandListener: jest.fn(() => ({ remove: mockRemoveSubscription })),
  ackCommand: jest.fn(),
  getPendingCommands: jest.fn(),
}));

jest.mock('@/hooks/use-commit-walk-event', () => ({
  useCommitWalkEvent: () => async (operation: () => Promise<unknown>) => operation(),
}));

jest.mock('@/hooks/use-walk-event-recorder', () => ({
  useWalkEventRecorder: () => ({
    recordEvent: mockRecordEvent,
  }),
}));

jest.mock('@/hooks/use-walk-session', () => ({
  useWalkSession: () => ({
    stop: mockStopWalk,
  }),
}));

const dog = {
  id: 'dog-1',
  name: 'Mugi',
  breed: null,
  gender: 'OTHER',
  createdAt: '2026-05-24T00:00:00.000Z',
};

describe('useWatchWalkCommandProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWalkStore.getState().reset();
    useWalkStore.getState().startRecording('walk-1', { dogs: [dog] });
    mockRecordEvent.mockResolvedValue({
      id: 'event-1',
      walkId: 'walk-1',
      dogId: 'dog-1',
      eventType: 'pee',
      occurredAt: '2026-05-24T01:00:00.000Z',
    });
    (getPendingCommands as jest.Mock).mockResolvedValue([
      {
        id: 'cmd-1',
        kind: 'recordEvent',
        walkId: 'walk-1',
        eventType: 'pee',
        dogId: 'dog-1',
        occurredAt: '2026-05-24T01:00:00.000Z',
        lat: 35.68,
        lng: 139.76,
      },
    ]);
  });

  it('drains pending Watch commands and acknowledges them after commit', async () => {
    renderHook(() => useWatchWalkCommandProcessor());

    await waitFor(() => {
      expect(mockRecordEvent).toHaveBeenCalledWith('pee', 'dog-1', {
        occurredAt: '2026-05-24T01:00:00.000Z',
        latestPoint: { lat: 35.68, lng: 139.76 },
        clientRequestId: 'cmd-1',
      });
    });
    expect(ackCommand).toHaveBeenCalledWith('cmd-1');
  });

  it('processes live Watch commands from the bridge listener', async () => {
    renderHook(() => useWatchWalkCommandProcessor());
    const listener = (addCommandListener as jest.Mock).mock.calls[0][0];

    await act(async () => {
      listener({
        id: 'cmd-2',
        kind: 'endWalk',
        walkId: 'walk-1',
        occurredAt: '2026-05-24T01:05:00.000Z',
      });
    });

    await waitFor(() => {
      expect(mockStopWalk).toHaveBeenCalledWith('walk-1');
    });
    expect(ackCommand).toHaveBeenCalledWith('cmd-2');
  });

  it('does not process the same Watch command concurrently', async () => {
    let resolveRecordEvent: (value: unknown) => void = () => {};
    mockRecordEvent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRecordEvent = resolve;
        }),
    );

    renderHook(() => useWatchWalkCommandProcessor());
    await waitFor(() => {
      expect(mockRecordEvent).toHaveBeenCalledTimes(1);
    });

    const listener = (addCommandListener as jest.Mock).mock.calls[0][0];
    await act(async () => {
      listener({
        id: 'cmd-1',
        kind: 'recordEvent',
        walkId: 'walk-1',
        eventType: 'pee',
        dogId: 'dog-1',
        occurredAt: '2026-05-24T01:00:00.000Z',
        lat: 35.68,
        lng: 139.76,
      });
    });

    expect(mockRecordEvent).toHaveBeenCalledTimes(1);
    resolveRecordEvent({
      id: 'event-1',
      walkId: 'walk-1',
      dogId: 'dog-1',
      eventType: 'pee',
      occurredAt: '2026-05-24T01:00:00.000Z',
    });
    await waitFor(() => {
      expect(ackCommand).toHaveBeenCalledWith('cmd-1');
    });
  });

  it('acknowledges and discards pending Watch commands when no active walk exists', async () => {
    useWalkStore.getState().reset();

    renderHook(() => useWatchWalkCommandProcessor());

    await waitFor(() => {
      expect(ackCommand).toHaveBeenCalledWith('cmd-1');
    });
    expect(mockRecordEvent).not.toHaveBeenCalled();
    expect(mockStopWalk).not.toHaveBeenCalled();
    expect(useWalkStore.getState().phase).toBe('ready');
  });

  it('acknowledges and discards pending Watch commands for a stale walk', async () => {
    (getPendingCommands as jest.Mock).mockResolvedValue([
      {
        id: 'cmd-end',
        kind: 'endWalk',
        walkId: 'walk-stale',
        occurredAt: '2026-05-24T01:05:00.000Z',
      },
    ]);

    renderHook(() => useWatchWalkCommandProcessor());

    await waitFor(() => {
      expect(ackCommand).toHaveBeenCalledWith('cmd-end');
    });
    expect(mockStopWalk).not.toHaveBeenCalled();
  });

  it('removes the bridge listener on unmount', () => {
    const { unmount } = renderHook(() => useWatchWalkCommandProcessor());

    unmount();

    expect(mockRemoveSubscription).toHaveBeenCalledTimes(1);
  });
});
