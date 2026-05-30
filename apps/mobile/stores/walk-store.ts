import { create } from 'zustand';
import type { Dog, WalkPoint, WalkEvent } from '@/types/graphql';
import {
  type ActiveWalkSessionSnapshot,
  clearActiveWalkSession,
  persistActiveWalkSession,
} from '@/lib/walk/active-walk-session';
import { haversineDistance } from '@/lib/walk/distance';

type WalkPhase = 'ready' | 'recording' | 'finished';

interface StartRecordingOptions {
  startedAt?: Date;
  selectedDogIds?: string[];
  dogs?: Dog[];
  points?: WalkPoint[];
  flushedPointCount?: number;
  totalDistanceM?: number;
  events?: WalkEvent[];
}

interface WalkState {
  phase: WalkPhase;
  walkId: string | null;
  selectedDogIds: string[];
  dogs: Dog[];
  points: WalkPoint[];
  flushedPointCount: number;
  totalDistanceM: number;
  startedAt: Date | null;
  events: WalkEvent[];
  trackingGeneration: number;
  trackingCleanup: (() => void | Promise<void>) | null;
  // Bumped to a fresh timestamp each time a quick action requests the camera
  // flow. WalkEventActions watches it and triggers handlePhoto. Using a
  // timestamp instead of a boolean gives a distinct value per request so repeat
  // taps fire even if the previous one wasn't acknowledged yet.
  cameraRequestedAt: number | null;
  /** Recording bottom sheet collapsed to the compact pill variant. */
  isMinimized: boolean;
  selectDog: (dogId: string) => void;
  setSelectedDogs: (dogIds: string[]) => void;
  startRecording: (walkId: string, options?: StartRecordingOptions) => void;
  hydrateRecordingSession: (session: ActiveWalkSessionSnapshot) => void;
  addPoint: (point: WalkPoint) => void;
  setTotalDistanceM: (distanceM: number) => void;
  markFlushedPointCount: (count: number) => void;
  addEvent: (event: WalkEvent) => void;
  removeEvent: (eventId: string) => void;
  requestCamera: () => void;
  clearCameraRequest: () => void;
  setMinimized: (value: boolean) => void;
  activateTrackingSession: () => number;
  attachTrackingCleanup: (generation: number, cleanup: () => void | Promise<void>) => boolean;
  stopTrackingSession: () => Promise<void>;
  resetTrackingSession: () => void;
  finish: () => void;
  reset: () => void;
}

async function runTrackingCleanup(cleanup: (() => void | Promise<void>) | null) {
  await cleanup?.();
}

function buildActiveWalkSessionSnapshot(state: WalkState): ActiveWalkSessionSnapshot | null {
  if (state.phase !== 'recording' || !state.walkId || !state.startedAt) return null;

  return {
    walkId: state.walkId,
    startedAt: state.startedAt.toISOString(),
    selectedDogIds: state.selectedDogIds,
    dogs: state.dogs,
    points: state.points,
    flushedPointCount: state.flushedPointCount,
    totalDistanceM: state.totalDistanceM,
    events: state.events,
  };
}

function persistRecordingState(state: WalkState) {
  const snapshot = buildActiveWalkSessionSnapshot(state);
  if (!snapshot) return;

  void persistActiveWalkSession(snapshot).catch((error) => {
    console.error('[walk.activeSession.persist] failed', error);
  });
}

function clearPersistedRecordingState() {
  void clearActiveWalkSession().catch((error) => {
    console.error('[walk.activeSession.clear] failed', error);
  });
}

export const useWalkStore = create<WalkState>((set, get) => ({
  phase: 'ready',
  walkId: null,
  selectedDogIds: [],
  dogs: [],
  points: [],
  flushedPointCount: 0,
  totalDistanceM: 0,
  startedAt: null,
  events: [],
  trackingGeneration: 0,
  trackingCleanup: null,
  cameraRequestedAt: null,
  isMinimized: false,

  selectDog: (dogId) => {
    set((state) => {
      const nextState = {
        selectedDogIds: state.selectedDogIds.includes(dogId)
          ? state.selectedDogIds.filter((id) => id !== dogId)
          : [...state.selectedDogIds, dogId],
      };
      return nextState;
    });
    persistRecordingState(get());
  },

  setSelectedDogs: (dogIds) => {
    set({ selectedDogIds: dogIds });
    persistRecordingState(get());
  },

  startRecording: (walkId, options) => {
    const dogs = options?.dogs ?? [];
    set({
      phase: 'recording',
      walkId,
      startedAt: options?.startedAt ?? new Date(),
      selectedDogIds: options?.selectedDogIds ?? dogs.map((dog) => dog.id),
      dogs,
      points: options?.points ?? [],
      flushedPointCount: options?.flushedPointCount ?? 0,
      totalDistanceM: options?.totalDistanceM ?? 0,
      events: options?.events ?? [],
    });
    persistRecordingState(get());
  },

  hydrateRecordingSession: (session) => {
    set({
      phase: 'recording',
      walkId: session.walkId,
      startedAt: new Date(session.startedAt),
      selectedDogIds: session.selectedDogIds,
      dogs: session.dogs,
      points: session.points,
      flushedPointCount: session.flushedPointCount,
      totalDistanceM: session.totalDistanceM,
      events: session.events,
    });
    persistRecordingState(get());
  },

  addPoint: (point) => {
    set((state) => {
      const previousPoint = state.points[state.points.length - 1];
      const nextDistanceM = previousPoint
        ? state.totalDistanceM + haversineDistance(previousPoint, point)
        : state.totalDistanceM;

      return {
        points: [...state.points, point],
        totalDistanceM: nextDistanceM,
      };
    });
    persistRecordingState(get());
  },

  setTotalDistanceM: (distanceM) => {
    set({ totalDistanceM: distanceM });
    persistRecordingState(get());
  },

  markFlushedPointCount: (count) =>
    {
      set((state) => ({
        flushedPointCount: Math.min(state.points.length, Math.max(state.flushedPointCount, count)),
      }));
      persistRecordingState(get());
    },

  addEvent: (event) => {
    set((state) => ({ events: [...state.events.filter((e) => e.id !== event.id), event] }));
    persistRecordingState(get());
  },

  removeEvent: (eventId) => {
    set((state) => ({ events: state.events.filter((e) => e.id !== eventId) }));
    persistRecordingState(get());
  },

  requestCamera: () => set({ cameraRequestedAt: Date.now() }),

  clearCameraRequest: () => set({ cameraRequestedAt: null }),

  setMinimized: (value) => set({ isMinimized: value }),

  activateTrackingSession: () => {
    const nextGeneration = get().trackingGeneration + 1;
    const cleanup = get().trackingCleanup;
    set({ trackingGeneration: nextGeneration, trackingCleanup: null });
    void runTrackingCleanup(cleanup);
    return nextGeneration;
  },

  attachTrackingCleanup: (generation, cleanup) => {
    if (get().trackingGeneration !== generation) {
      return false;
    }

    set({ trackingCleanup: cleanup });
    return true;
  },

  stopTrackingSession: async () => {
    const nextGeneration = get().trackingGeneration + 1;
    const cleanup = get().trackingCleanup;
    set({ trackingGeneration: nextGeneration, trackingCleanup: null });
    await runTrackingCleanup(cleanup);
  },

  resetTrackingSession: () => {
    const cleanup = get().trackingCleanup;
    set({ trackingGeneration: 0, trackingCleanup: null });
    void runTrackingCleanup(cleanup);
  },

  finish: () => {
    set({ phase: 'finished', cameraRequestedAt: null, isMinimized: false });
    clearPersistedRecordingState();
  },

  reset: () => {
    const cleanup = get().trackingCleanup;
    set({
      phase: 'ready',
      walkId: null,
      selectedDogIds: [],
      dogs: [],
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
    void runTrackingCleanup(cleanup);
    clearPersistedRecordingState();
  },
}));
