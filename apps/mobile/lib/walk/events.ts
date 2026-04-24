import type { WalkEventType } from '@/types/graphql';

export const EVENT_ORDER: readonly WalkEventType[] = ['pee', 'poo', 'photo'] as const;

export const MAP_EVENT_EMOJIS: Record<WalkEventType, string> = {
  pee: '🚽',
  poo: '💩',
  photo: '📷',
};

export const UI_EVENT_EMOJIS: Record<WalkEventType, string> = {
  pee: '💧',
  poo: '💩',
  photo: '📷',
};

export interface CountableEvent {
  eventType: WalkEventType;
  dogId?: string | null;
}

export function countEventsByType(
  events?: CountableEvent[] | null,
  opts?: { dogId?: string },
): Record<WalkEventType, number> {
  const counts: Record<WalkEventType, number> = { pee: 0, poo: 0, photo: 0 };
  if (!events) return counts;
  for (const e of events) {
    if (opts?.dogId !== undefined && e.dogId !== opts.dogId) continue;
    if (e.eventType === 'pee' || e.eventType === 'poo' || e.eventType === 'photo') {
      counts[e.eventType] += 1;
    }
  }
  return counts;
}

export function countWalkActivityEvents(
  events?: CountableEvent[] | null,
): { pee: number; poo: number } {
  const all = countEventsByType(events);
  return { pee: all.pee, poo: all.poo };
}
