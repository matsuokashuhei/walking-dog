import {
  EVENT_ORDER,
  MAP_EVENT_EMOJIS,
  UI_EVENT_EMOJIS,
  countEventsByType,
  countWalkActivityEvents,
  type CountableEvent,
} from './events';

describe('EVENT_ORDER', () => {
  it('orders active event actions as pee → poo', () => {
    expect(EVENT_ORDER).toEqual(['pee', 'poo']);
  });
});

describe('MAP_EVENT_EMOJIS (map markers)', () => {
  it('uses the toilet emoji for pee on map pins', () => {
    expect(MAP_EVENT_EMOJIS.pee).toBe('🚽');
  });

  it('maps poo to poop emoji', () => {
    expect(MAP_EVENT_EMOJIS.poo).toBe('💩');
  });

  it('maps photo to camera emoji', () => {
    expect(MAP_EVENT_EMOJIS.photo).toBe('📷');
  });
});

describe('UI_EVENT_EMOJIS (buttons, summary cards)', () => {
  it('uses the droplet emoji for pee in UI surfaces', () => {
    expect(UI_EVENT_EMOJIS.pee).toBe('💧');
  });

  it('maps poo to poop emoji', () => {
    expect(UI_EVENT_EMOJIS.poo).toBe('💩');
  });

  it('maps photo to camera emoji', () => {
    expect(UI_EVENT_EMOJIS.photo).toBe('📷');
  });
});

describe('countEventsByType', () => {
  it('returns all-zero counts for undefined, null, or empty input', () => {
    expect(countEventsByType()).toEqual({ pee: 0, poo: 0, photo: 0 });
    expect(countEventsByType(null)).toEqual({ pee: 0, poo: 0, photo: 0 });
    expect(countEventsByType([])).toEqual({ pee: 0, poo: 0, photo: 0 });
  });

  it('counts events across all types regardless of dogId when no filter given', () => {
    const events: CountableEvent[] = [
      { eventType: 'pee', dogId: 'dog-1' },
      { eventType: 'pee', dogId: 'dog-2' },
      { eventType: 'poo', dogId: 'dog-1' },
      { eventType: 'photo', dogId: null },
    ];
    expect(countEventsByType(events)).toEqual({ pee: 2, poo: 1, photo: 1 });
  });

  it('filters by dogId when opts.dogId is provided', () => {
    const events: CountableEvent[] = [
      { eventType: 'pee', dogId: 'dog-1' },
      { eventType: 'pee', dogId: 'dog-2' },
      { eventType: 'poo', dogId: 'dog-1' },
      { eventType: 'photo', dogId: 'dog-1' },
    ];
    expect(countEventsByType(events, { dogId: 'dog-1' })).toEqual({
      pee: 1,
      poo: 1,
      photo: 1,
    });
  });

  it('excludes events with mismatched dogId when filtering', () => {
    const events: CountableEvent[] = [
      { eventType: 'pee', dogId: 'dog-2' },
      { eventType: 'poo', dogId: null },
    ];
    expect(countEventsByType(events, { dogId: 'dog-1' })).toEqual({
      pee: 0,
      poo: 0,
      photo: 0,
    });
  });
});

describe('countWalkActivityEvents', () => {
  it('returns zeros for undefined, null, or empty input', () => {
    expect(countWalkActivityEvents()).toEqual({ pee: 0, poo: 0 });
    expect(countWalkActivityEvents(null)).toEqual({ pee: 0, poo: 0 });
    expect(countWalkActivityEvents([])).toEqual({ pee: 0, poo: 0 });
  });

  it('counts pee and poo events and ignores photos', () => {
    const events: CountableEvent[] = [
      { eventType: 'pee' },
      { eventType: 'poo' },
      { eventType: 'pee' },
      { eventType: 'photo' },
    ];
    expect(countWalkActivityEvents(events)).toEqual({ pee: 2, poo: 1 });
  });
});
