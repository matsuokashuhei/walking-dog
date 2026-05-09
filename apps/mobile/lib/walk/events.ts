import type { WalkEventType } from '@/types/graphql';

type CountedWalkEventType = Extract<WalkEventType, 'pee' | 'poo' | 'photo'>;

export const EVENT_ORDER: readonly CountedWalkEventType[] = ['pee', 'poo'] as const;

export const MAP_EVENT_EMOJIS: Record<WalkEventType, string> = {
  pee: '🚽',
  poo: '💩',
  sniff: '🐽',
  greet: '🐾',
  photo: '📷',
};

export const UI_EVENT_EMOJIS: Record<WalkEventType, string> = {
  pee: '💧',
  poo: '💩',
  sniff: '🐽',
  greet: '🐾',
  photo: '📷',
};

export interface CountableEvent {
  eventType: WalkEventType;
  dogId?: string | null;
}

export function countEventsByType(
  events?: CountableEvent[] | null,
  opts?: { dogId?: string },
): Record<CountedWalkEventType, number> {
  const counts: Record<CountedWalkEventType, number> = { pee: 0, poo: 0, photo: 0 };
  if (!events) return counts;
  for (const e of events) {
    if (opts?.dogId !== undefined && e.dogId !== opts.dogId) continue;
    if (
      e.eventType === 'pee' ||
      e.eventType === 'poo' ||
      e.eventType === 'photo'
    ) {
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
