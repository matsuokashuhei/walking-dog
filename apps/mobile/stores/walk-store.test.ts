import { useWalkStore } from './walk-store';
import type { WalkPoint, WalkEvent } from '@/types/graphql';

beforeEach(() => {
  useWalkStore.getState().reset();
});

describe('walk-store', () => {
  it('initial phase is ready', () => {
    expect(useWalkStore.getState().phase).toBe('ready');
  });

  it('isMinimized defaults to false and toggles via setMinimized', () => {
    expect(useWalkStore.getState().isMinimized).toBe(false);
    useWalkStore.getState().setMinimized(true);
    expect(useWalkStore.getState().isMinimized).toBe(true);
    useWalkStore.getState().setMinimized(false);
    expect(useWalkStore.getState().isMinimized).toBe(false);
  });

  it('reset clears isMinimized back to false', () => {
    useWalkStore.getState().setMinimized(true);
    useWalkStore.getState().reset();
    expect(useWalkStore.getState().isMinimized).toBe(false);
  });

  it('selectDog toggles dog selection', () => {
    const { selectDog } = useWalkStore.getState();
    selectDog('dog-1');
    expect(useWalkStore.getState().selectedDogIds).toEqual(['dog-1']);
    selectDog('dog-2');
    expect(useWalkStore.getState().selectedDogIds).toEqual(['dog-1', 'dog-2']);
    selectDog('dog-1');
    expect(useWalkStore.getState().selectedDogIds).toEqual(['dog-2']);
  });

  it('startRecording transitions to recording phase', () => {
    useWalkStore.getState().startRecording('walk-123');
    const state = useWalkStore.getState();
    expect(state.phase).toBe('recording');
    expect(state.walkId).toBe('walk-123');
    expect(state.startedAt).toBeInstanceOf(Date);
  });

  it('addPoint accumulates points and distance', () => {
    useWalkStore.getState().startRecording('walk-123');
    const p1: WalkPoint = { lat: 35.6812, lng: 139.7671, recordedAt: '2026-03-23T10:00:00Z' };
    const p2: WalkPoint = { lat: 35.6813, lng: 139.7672, recordedAt: '2026-03-23T10:00:05Z' };
    useWalkStore.getState().addPoint(p1);
    useWalkStore.getState().addPoint(p2);
    const state = useWalkStore.getState();
    expect(state.points).toHaveLength(2);
    expect(state.totalDistanceM).toBeGreaterThan(0);
  });

  it('finish transitions to finished phase', () => {
    useWalkStore.getState().startRecording('walk-123');
    useWalkStore.getState().finish();
    expect(useWalkStore.getState().phase).toBe('finished');
  });

  it('reset returns to ready phase', () => {
    useWalkStore.getState().startRecording('walk-123');
    useWalkStore.getState().finish();
    useWalkStore.getState().reset();
    const state = useWalkStore.getState();
    expect(state.phase).toBe('ready');
    expect(state.walkId).toBeNull();
    expect(state.points).toEqual([]);
    expect(state.selectedDogIds).toEqual([]);
  });

  describe('walk events', () => {
    const mockEvent: WalkEvent = {
      id: 'event-1',
      walkId: 'walk-123',
      dogId: 'dog-1',
      eventType: 'pee',
      occurredAt: '2026-04-12T10:00:00Z',
      lat: 35.6812,
      lng: 139.7671,
      photoUrl: null,
    };

    it('initial events is empty array', () => {
      expect(useWalkStore.getState().events).toEqual([]);
    });

    it('addEvent appends event to events array', () => {
      useWalkStore.getState().addEvent(mockEvent);
      expect(useWalkStore.getState().events).toHaveLength(1);
      expect(useWalkStore.getState().events[0]).toEqual(mockEvent);
    });

    it('addEvent can append multiple events', () => {
      const event2: WalkEvent = { ...mockEvent, id: 'event-2', eventType: 'poo' };
      useWalkStore.getState().addEvent(mockEvent);
      useWalkStore.getState().addEvent(event2);
      expect(useWalkStore.getState().events).toHaveLength(2);
    });

    it('removeEvent removes event by id', () => {
      const event2: WalkEvent = { ...mockEvent, id: 'event-2', eventType: 'poo' };
      useWalkStore.getState().addEvent(mockEvent);
      useWalkStore.getState().addEvent(event2);
      useWalkStore.getState().removeEvent('event-1');
      const state = useWalkStore.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].id).toBe('event-2');
    });

    it('reset clears events array', () => {
      useWalkStore.getState().addEvent(mockEvent);
      useWalkStore.getState().reset();
      expect(useWalkStore.getState().events).toEqual([]);
    });
  });
});
