import { create } from 'zustand';
import type { Dog, WalkPoint, WalkEvent } from '@/types/graphql';

type WalkPhase = 'ready' | 'recording' | 'finished';

interface WalkState {
  phase: WalkPhase;
  walkId: string | null;
  selectedDogIds: string[];
  activeDogs: Dog[];
  points: WalkPoint[];
  flushedPointCount: number;
  totalDistanceM: number;
  startedAt: Date | null;
  events: WalkEvent[];
  trackingGeneration: number;
  trackingCleanup: (() => void) | null;
  // Bumped to a fresh timestamp each time a quick action requests the camera
  // flow. WalkEventActions watches it and triggers handlePhoto. Using a
  // timestamp instead of a boolean gives a distinct value per request so repeat
  // taps fire even if the previous one wasn't acknowledged yet.
  cameraRequestedAt: number | null;
  /** Recording bottom sheet collapsed to the compact pill variant. */
  isMinimized: boolean;
  selectDog: (dogId: string) => void;
  setSelectedDogs: (dogIds: string[]) => void;
  startRecording: (walkId: string, dogs?: Dog[]) => void;
  addPoint: (point: WalkPoint) => void;
  setTotalDistanceM: (distanceM: number) => void;
  markFlushedPointCount: (count: number) => void;
  addEvent: (event: WalkEvent) => void;
  removeEvent: (eventId: string) => void;
  requestCamera: () => void;
  clearCameraRequest: () => void;
  setMinimized: (value: boolean) => void;
  activateTrackingSession: () => number;
  attachTrackingCleanup: (generation: number, cleanup: () => void) => boolean;
  stopTrackingSession: () => void;
  resetTrackingSession: () => void;
  finish: () => void;
  reset: () => void;
}

function clearTrackingCleanup(cleanup: (() => void) | null) {
  cleanup?.();
}

export const useWalkStore = create<WalkState>((set, get) => ({
  phase: 'ready',
  walkId: null,
  selectedDogIds: [],
  activeDogs: [],
  points: [],
  flushedPointCount: 0,
  totalDistanceM: 0,
  startedAt: null,
  events: [],
  trackingGeneration: 0,
  trackingCleanup: null,
  cameraRequestedAt: null,
  isMinimized: false,

  selectDog: (dogId) =>
    set((state) => ({
      selectedDogIds: state.selectedDogIds.includes(dogId)
        ? state.selectedDogIds.filter((id) => id !== dogId)
        : [...state.selectedDogIds, dogId],
    })),

  setSelectedDogs: (dogIds) => set({ selectedDogIds: dogIds }),

  startRecording: (walkId, dogs = []) =>
    set({ phase: 'recording', walkId, activeDogs: dogs, startedAt: new Date(), flushedPointCount: 0 }),

  // Distance はサーバ計算が真実の源。ローカルでは GPS 点を保持するだけにし、
  // totalDistanceM は walk クエリのポーリング結果を setTotalDistanceM で反映する。
  addPoint: (point) =>
    set((state) => ({
      points: [...state.points, point],
    })),

  setTotalDistanceM: (distanceM) => set({ totalDistanceM: distanceM }),

  markFlushedPointCount: (count) =>
    set((state) => ({
      flushedPointCount: Math.min(state.points.length, Math.max(state.flushedPointCount, count)),
    })),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events.filter((e) => e.id !== event.id), event] })),

  removeEvent: (eventId) =>
    set((state) => ({ events: state.events.filter((e) => e.id !== eventId) })),

  requestCamera: () => set({ cameraRequestedAt: Date.now() }),

  clearCameraRequest: () => set({ cameraRequestedAt: null }),

  setMinimized: (value) => set({ isMinimized: value }),

  activateTrackingSession: () => {
    const nextGeneration = get().trackingGeneration + 1;
    const cleanup = get().trackingCleanup;
    set({ trackingGeneration: nextGeneration, trackingCleanup: null });
    clearTrackingCleanup(cleanup);
    return nextGeneration;
  },

  attachTrackingCleanup: (generation, cleanup) => {
    if (get().trackingGeneration !== generation) {
      return false;
    }

    set({ trackingCleanup: cleanup });
    return true;
  },

  stopTrackingSession: () => {
    const nextGeneration = get().trackingGeneration + 1;
    const cleanup = get().trackingCleanup;
    set({ trackingGeneration: nextGeneration, trackingCleanup: null });
    clearTrackingCleanup(cleanup);
  },

  resetTrackingSession: () => {
    const cleanup = get().trackingCleanup;
    set({ trackingGeneration: 0, trackingCleanup: null });
    clearTrackingCleanup(cleanup);
  },

  finish: () => set({ phase: 'finished', cameraRequestedAt: null, isMinimized: false }),

  reset: () => {
    const cleanup = get().trackingCleanup;
    set({
      phase: 'ready',
      walkId: null,
      selectedDogIds: [],
      activeDogs: [],
      points: [],
      flushedPointCount: 0,
      totalDistanceM: 0,
      startedAt: null,
      events: [],
      trackingGeneration: 0,
      trackingCleanup: null,
      cameraRequestedAt: null,
      isMinimized: false,
    });
    clearTrackingCleanup(cleanup);
  },
}));
