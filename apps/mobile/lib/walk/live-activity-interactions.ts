import type { WalkActivityEventType } from '@/types/graphql';
import { parseWalkActivityTarget } from './live-activity';

interface WalkActivityTargetHandlers {
  recordEvent: (eventType: WalkActivityEventType, dogId: string) => Promise<void>;
  finishWalk: () => Promise<void>;
}

export async function handleWalkActivityTarget(
  target: string,
  handlers: WalkActivityTargetHandlers,
): Promise<void> {
  const parsed = parseWalkActivityTarget(target);

  if (parsed.kind === 'event') {
    await handlers.recordEvent(parsed.eventType, parsed.dogId);
    return;
  }

  if (parsed.kind === 'finish') {
    await handlers.finishWalk();
  }
}
