import { processWatchWalkCommand } from './commands';
import type { WatchWalkCommand } from './types';

const recordEvent = jest.fn();
const finishWalk = jest.fn();

const activeState = {
  phase: 'recording' as const,
  walkId: 'walk-1',
  dogIds: ['dog-1', 'dog-2'],
};

function eventCommand(overrides: Partial<WatchWalkCommand> = {}): WatchWalkCommand {
  return {
    id: 'cmd-1',
    kind: 'recordEvent',
    walkId: 'walk-1',
    eventType: 'pee',
    dogId: 'dog-1',
    occurredAt: '2026-05-24T01:00:00.000Z',
    lat: 35.68,
    lng: 139.76,
    ...overrides,
  } as WatchWalkCommand;
}

describe('processWatchWalkCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordEvent.mockResolvedValue(undefined);
    finishWalk.mockResolvedValue(undefined);
  });

  it('records dog-specific pee and poop commands with the command coordinate and idempotency key', async () => {
    await processWatchWalkCommand(eventCommand({ eventType: 'pee', dogId: 'dog-1' }), activeState, {
      recordEvent,
      finishWalk,
    });
    await processWatchWalkCommand(eventCommand({ id: 'cmd-2', eventType: 'poo', dogId: 'dog-2' }), activeState, {
      recordEvent,
      finishWalk,
    });

    expect(recordEvent).toHaveBeenNthCalledWith(1, {
      eventType: 'pee',
      dogId: 'dog-1',
      occurredAt: '2026-05-24T01:00:00.000Z',
      latestPoint: { lat: 35.68, lng: 139.76 },
      clientRequestId: 'cmd-1',
    });
    expect(recordEvent).toHaveBeenNthCalledWith(2, {
      eventType: 'poo',
      dogId: 'dog-2',
      occurredAt: '2026-05-24T01:00:00.000Z',
      latestPoint: { lat: 35.68, lng: 139.76 },
      clientRequestId: 'cmd-2',
    });
    expect(finishWalk).not.toHaveBeenCalled();
  });

  it('finishes the active walk', async () => {
    await processWatchWalkCommand(
      { id: 'cmd-stop', kind: 'endWalk', walkId: 'walk-1', occurredAt: '2026-05-24T01:00:00.000Z' },
      activeState,
      { recordEvent, finishWalk },
    );

    expect(finishWalk).toHaveBeenCalledWith('walk-1');
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('rejects commands when the iPhone is not recording', async () => {
    await expect(
      processWatchWalkCommand(
        eventCommand(),
        { phase: 'ready', walkId: null, dogIds: ['dog-1'] },
        { recordEvent, finishWalk },
      ),
    ).rejects.toThrow('Cannot process Watch command without an active walk');
  });

  it('rejects commands for a stale walk id', async () => {
    await expect(
      processWatchWalkCommand(eventCommand({ walkId: 'stale-walk' }), activeState, {
        recordEvent,
        finishWalk,
      }),
    ).rejects.toThrow('Watch command walkId does not match active walk');
  });

  it('rejects event commands without a selected dog', async () => {
    await expect(
      processWatchWalkCommand(eventCommand({ dogId: undefined }), activeState, {
        recordEvent,
        finishWalk,
      }),
    ).rejects.toThrow('Watch event command requires a dogId');
  });

  it('rejects event commands without a coordinate', async () => {
    await expect(
      processWatchWalkCommand(eventCommand({ lat: undefined }), activeState, {
        recordEvent,
        finishWalk,
      }),
    ).rejects.toThrow('Watch event command requires latitude and longitude');
  });

  it('rejects event commands for dogs outside the active walk', async () => {
    await expect(
      processWatchWalkCommand(eventCommand({ dogId: 'dog-3' }), activeState, {
        recordEvent,
        finishWalk,
      }),
    ).rejects.toThrow('Watch event command dogId is not part of the active walk');
  });
});
