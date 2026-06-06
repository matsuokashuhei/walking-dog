import { useWalkStore } from './walk-store';
import type { Dog, WalkPoint, WalkEvent } from '@/types/graphql';
import {
  clearActiveWalkSession,
  persistActiveWalkSession,
} from '@/lib/walk/active-walk-session';

jest.mock('@/lib/walk/active-walk-session', () => ({
  clearActiveWalkSession: jest.fn(() => Promise.resolve()),
  persistActiveWalkSession: jest.fn(() => Promise.resolve()),
}));

const dog: Dog = {
  id: 'dog-1',
  name: 'Mugi',
  breed: null,
  gender: 'OTHER',
  createdAt: '2026-04-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  useWalkStore.getState().reset();
});

describe('walk-store', () => {
  it('initial phase is ready', () => {
    expect(useWalkStore.getState().phase).toBe('ready');
  });

  describe('tracking session state', () => {
    it('activateTrackingSession bumps the generation and clears the previous cleanup', () => {
      const firstGeneration = useWalkStore.getState().activateTrackingSession();
      const firstCleanup = jest.fn();

      expect(useWalkStore.getState().attachTrackingCleanup(firstGeneration, firstCleanup)).toBe(true);

      const nextGeneration = useWalkStore.getState().activateTrackingSession();

      expect(firstCleanup).toHaveBeenCalledTimes(1);
      expect(nextGeneration).toBe(firstGeneration + 1);
      expect(useWalkStore.getState().trackingGeneration).toBe(nextGeneration);
      expect(useWalkStore.getState().trackingCleanup).toBeNull();
    });

    it('only accepts cleanup registration for the active generation and stopTrackingSession runs it', () => {
      const generation = useWalkStore.getState().activateTrackingSession();
      const staleCleanup = jest.fn();
      const activeCleanup = jest.fn();

      expect(useWalkStore.getState().attachTrackingCleanup(generation - 1, staleCleanup)).toBe(false);
      expect(useWalkStore.getState().attachTrackingCleanup(generation, activeCleanup)).toBe(true);

      useWalkStore.getState().stopTrackingSession();

      expect(staleCleanup).not.toHaveBeenCalled();
      expect(activeCleanup).toHaveBeenCalledTimes(1);
      expect(useWalkStore.getState().trackingGeneration).toBe(generation + 1);
      expect(useWalkStore.getState().trackingCleanup).toBeNull();
    });
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
    useWalkStore.getState().markFlushedPointCount(99);
    useWalkStore.getState().startRecording('walk-123', {
      startedAt: new Date('2026-04-01T00:00:00Z'),
      dogs: [dog],
      selectedDogIds: ['dog-1'],
    });
    const state = useWalkStore.getState();
    expect(state.phase).toBe('recording');
    expect(state.walkId).toBe('walk-123');
    expect(state.startedAt).toEqual(new Date('2026-04-01T00:00:00Z'));
    expect(state.flushedPointCount).toBe(0);
    expect(state.dogs).toEqual([dog]);
    expect(persistActiveWalkSession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        walkId: 'walk-123',
        startedAt: '2026-04-01T00:00:00.000Z',
        selectedDogIds: ['dog-1'],
        dogs: [dog],
      }),
    );
  });

  it('addPoint accumulates points, computes distance locally, and persists active state', () => {
    useWalkStore.getState().startRecording('walk-123');
    const p1: WalkPoint = { lat: 35.6812, lng: 139.7671, recordedAt: '2026-03-23T10:00:00Z' };
    const p2: WalkPoint = { lat: 35.6813, lng: 139.7672, recordedAt: '2026-03-23T10:00:05Z' };
    useWalkStore.getState().addPoint(p1);
    useWalkStore.getState().addPoint(p2);
    const state = useWalkStore.getState();
    expect(state.points).toHaveLength(2);
    expect(state.totalDistanceM).toBeGreaterThan(0);
    expect(persistActiveWalkSession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        points: [p1, p2],
        totalDistanceM: state.totalDistanceM,
      }),
    );
  });

  it('addPoint ignores duplicate points from overlapping foreground and background sources', () => {
    useWalkStore.getState().startRecording('walk-123');
    const point: WalkPoint = { lat: 35.6812, lng: 139.7671, recordedAt: '2026-03-23T10:00:00Z' };

    useWalkStore.getState().addPoint(point);
    jest.clearAllMocks();
    useWalkStore.getState().addPoint({ ...point });

    expect(useWalkStore.getState().points).toEqual([point]);
    expect(persistActiveWalkSession).not.toHaveBeenCalled();
  });

  it('setTotalDistanceM overwrites totalDistanceM with the server-calculated value', () => {
    useWalkStore.getState().setTotalDistanceM(1234);
    expect(useWalkStore.getState().totalDistanceM).toBe(1234);
    useWalkStore.getState().setTotalDistanceM(5678);
    expect(useWalkStore.getState().totalDistanceM).toBe(5678);
  });

  it('markFlushedPointCount advances the cursor without exceeding points length', () => {
    useWalkStore.getState().startRecording('walk-123');
    useWalkStore.getState().addPoint({
      lat: 35.6812,
      lng: 139.7671,
      recordedAt: '2026-03-23T10:00:00Z',
    });
    useWalkStore.getState().addPoint({
      lat: 35.6813,
      lng: 139.7672,
      recordedAt: '2026-03-23T10:00:05Z',
    });

    useWalkStore.getState().markFlushedPointCount(1);
    expect(useWalkStore.getState().flushedPointCount).toBe(1);

    useWalkStore.getState().markFlushedPointCount(99);
    expect(useWalkStore.getState().flushedPointCount).toBe(2);
  });

  it('finish transitions to finished phase', () => {
    useWalkStore.getState().startRecording('walk-123');
    useWalkStore.getState().finish();
    expect(useWalkStore.getState().phase).toBe('finished');
    expect(clearActiveWalkSession).toHaveBeenCalled();
  });

  it('reset returns to ready phase', () => {
    useWalkStore.getState().startRecording('walk-123');
    useWalkStore.getState().finish();
    useWalkStore.getState().reset();
    const state = useWalkStore.getState();
    expect(state.phase).toBe('ready');
    expect(state.walkId).toBeNull();
    expect(state.points).toEqual([]);
    expect(state.flushedPointCount).toBe(0);
    expect(state.selectedDogIds).toEqual([]);
    expect(clearActiveWalkSession).toHaveBeenCalled();
  });

  it('hydrates a persisted active walk as recording', () => {
    const point: WalkPoint = {
      lat: 35.6812,
      lng: 139.7671,
      recordedAt: '2026-04-01T00:00:05Z',
    };

    useWalkStore.getState().hydrateRecordingSession({
      walkId: 'walk-123',
      startedAt: '2026-04-01T00:00:00.000Z',
      selectedDogIds: ['dog-1'],
      dogs: [dog],
      points: [point],
      flushedPointCount: 0,
      totalDistanceM: 12,
      events: [],
    });

    const state = useWalkStore.getState();
    expect(state.phase).toBe('recording');
    expect(state.walkId).toBe('walk-123');
    expect(state.startedAt).toEqual(new Date('2026-04-01T00:00:00.000Z'));
    expect(state.selectedDogIds).toEqual(['dog-1']);
    expect(state.dogs).toEqual([dog]);
    expect(state.points).toEqual([point]);
    expect(state.totalDistanceM).toBe(12);
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

    it('addEvent replaces an existing event with the same id', () => {
      const updatedEvent: WalkEvent = { ...mockEvent, eventType: 'poo' };
      useWalkStore.getState().addEvent(mockEvent);
      useWalkStore.getState().addEvent(updatedEvent);
      expect(useWalkStore.getState().events).toEqual([updatedEvent]);
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
