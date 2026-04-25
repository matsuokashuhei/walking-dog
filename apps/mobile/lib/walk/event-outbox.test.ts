import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPendingEvents,
  enqueuePendingEvent,
  listPendingEvents,
  removePendingEvent,
} from './event-outbox';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
      __reset: () => store.clear(),
    },
  };
});

beforeEach(async () => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
});

describe('event-outbox', () => {
  describe('listPendingEvents', () => {
    it('returns an empty array when no outbox has been written', async () => {
      expect(await listPendingEvents()).toEqual([]);
    });

    it('returns an empty array when stored payload has an unknown schema version', async () => {
      await AsyncStorage.setItem(
        'walk_event_outbox_v1',
        JSON.stringify({ version: 999, items: [{ id: 'x' }] }),
      );
      expect(await listPendingEvents()).toEqual([]);
    });

    it('returns an empty array when stored payload is corrupt', async () => {
      await AsyncStorage.setItem('walk_event_outbox_v1', '{not json');
      expect(await listPendingEvents()).toEqual([]);
    });
  });

  describe('enqueuePendingEvent', () => {
    it('appends a pee event with synthetic id, queuedAt, and the supplied payload', async () => {
      const item = await enqueuePendingEvent({
        walkId: 'walk-1',
        dogId: 'dog-1',
        eventType: 'pee',
        occurredAt: '2026-04-25T08:30:00.000Z',
        lat: 35.68,
        lng: 139.76,
      });

      expect(item.id).toMatch(/^evt_/);
      expect(item.queuedAt).toEqual(expect.any(String));
      expect(item.walkId).toBe('walk-1');
      expect(item.eventType).toBe('pee');

      const all = await listPendingEvents();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(item);
    });

    it('appends without overwriting earlier entries (FIFO order)', async () => {
      const first = await enqueuePendingEvent({
        walkId: 'walk-1',
        eventType: 'pee',
        occurredAt: '2026-04-25T08:30:00.000Z',
      });
      const second = await enqueuePendingEvent({
        walkId: 'walk-1',
        eventType: 'poo',
        occurredAt: '2026-04-25T08:31:00.000Z',
      });

      const all = await listPendingEvents();
      expect(all.map((e) => e.id)).toEqual([first.id, second.id]);
    });
  });

  describe('removePendingEvent', () => {
    it('removes the item with the matching id and leaves others in place', async () => {
      const a = await enqueuePendingEvent({
        walkId: 'walk-1',
        eventType: 'pee',
        occurredAt: '2026-04-25T08:30:00.000Z',
      });
      const b = await enqueuePendingEvent({
        walkId: 'walk-1',
        eventType: 'poo',
        occurredAt: '2026-04-25T08:31:00.000Z',
      });

      await removePendingEvent(a.id);

      const remaining = await listPendingEvents();
      expect(remaining.map((e) => e.id)).toEqual([b.id]);
    });

    it('is a no-op when the id is not present', async () => {
      const a = await enqueuePendingEvent({
        walkId: 'walk-1',
        eventType: 'pee',
        occurredAt: '2026-04-25T08:30:00.000Z',
      });
      await removePendingEvent('nonexistent');
      expect(await listPendingEvents()).toHaveLength(1);
      expect((await listPendingEvents())[0].id).toBe(a.id);
    });
  });

  describe('clearPendingEvents', () => {
    it('drops all queued items', async () => {
      await enqueuePendingEvent({
        walkId: 'walk-1',
        eventType: 'pee',
        occurredAt: '2026-04-25T08:30:00.000Z',
      });
      await enqueuePendingEvent({
        walkId: 'walk-1',
        eventType: 'poo',
        occurredAt: '2026-04-25T08:31:00.000Z',
      });

      await clearPendingEvents();

      expect(await listPendingEvents()).toEqual([]);
    });
  });
});
