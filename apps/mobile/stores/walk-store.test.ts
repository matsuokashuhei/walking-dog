import { useWalkStore } from './walk-store';
import type { WalkPoint } from '@/types/graphql';

beforeEach(() => {
  useWalkStore.getState().reset();
});

describe('walk-store', () => {
  it('initial phase is ready', () => {
    expect(useWalkStore.getState().phase).toBe('ready');
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
});
