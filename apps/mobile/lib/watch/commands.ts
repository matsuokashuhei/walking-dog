import type { WalkActivityEventType } from '@/types/graphql';
import type { WatchWalkCommand } from './types';

interface WatchWalkCommandState {
  phase: 'ready' | 'recording' | 'finished';
  walkId: string | null;
  dogIds: string[];
}

interface RecordWatchWalkEventArgs {
  eventType: Extract<WalkActivityEventType, 'pee' | 'poo'>;
  dogId: string;
  occurredAt: string;
  latestPoint: { lat: number; lng: number };
  clientRequestId: string;
}

interface WatchWalkCommandHandlers {
  recordEvent: (args: RecordWatchWalkEventArgs) => Promise<unknown>;
  finishWalk: (walkId: string) => Promise<unknown>;
}

function assertActiveWalk(command: WatchWalkCommand, state: WatchWalkCommandState): string {
  if (state.phase !== 'recording' || !state.walkId) {
    throw new Error('Cannot process Watch command without an active walk');
  }
  if (command.walkId !== state.walkId) {
    throw new Error('Watch command walkId does not match active walk');
  }
  return state.walkId;
}

export async function processWatchWalkCommand(
  command: WatchWalkCommand,
  state: WatchWalkCommandState,
  handlers: WatchWalkCommandHandlers,
): Promise<void> {
  const walkId = assertActiveWalk(command, state);

  if (command.kind === 'endWalk') {
    await handlers.finishWalk(walkId);
    return;
  }

  if (!command.dogId) {
    throw new Error('Watch event command requires a dogId');
  }
  if (!state.dogIds.includes(command.dogId)) {
    throw new Error('Watch event command dogId is not part of the active walk');
  }
  if (command.lat == null || command.lng == null) {
    throw new Error('Watch event command requires latitude and longitude');
  }

  await handlers.recordEvent({
    eventType: command.eventType,
    dogId: command.dogId,
    occurredAt: command.occurredAt,
    latestPoint: { lat: command.lat, lng: command.lng },
    clientRequestId: command.id,
  });
}
