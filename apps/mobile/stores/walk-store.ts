import { create } from 'zustand';
import { haversineDistance } from '@/lib/walk/distance';
import type { WalkPoint, WalkEvent } from '@/types/graphql';

type WalkPhase = 'ready' | 'recording' | 'finished';

export interface LiveActivityState {
  activityId: string;
  startedAt: Date;
  /** Epoch ms of the most recent successful native update. 0 means no update has happened yet. */
  lastUpdateAt: number;
}

interface WalkState {
  phase: WalkPhase;
  walkId: string | null;
  selectedDogIds: string[];
  points: WalkPoint[];
  flushedPointCount: number;
  totalDistanceM: number;
  startedAt: Date | null;
  events: WalkEvent[];
  trackingGeneration: number;
  trackingCleanup: (() => void) | null;
  // Bumped to a fresh timestamp each time the Live Activity camera button (or
  // any other source) requests the camera flow. WalkEventActions watches it
  // and triggers handlePhoto. Using a timestamp instead of a boolean gives a
  // distinct value per request so repeat taps fire even if the previous one
  // wasn't acknowledged yet.
  cameraRequestedAt: number | null;
  /** Recording bottom sheet collapsed to the compact pill variant. */
  isMinimized: boolean;
  /**
   * iOS Live Activity bookkeeping. `null` while no activity is alive (Android,
   * unsupported iOS, or after `endLiveActivity`). When set, `activityId` is
   * the native handle returned by the iOS module and `lastUpdateAt` gates the
   * native-update debounce in the session hook.
   */
  liveActivity: LiveActivityState | null;
  selectDog: (dogId: string) => void;
  setSelectedDogs: (dogIds: string[]) => void;
  startRecording: (walkId: string) => void;
  addPoint: (point: WalkPoint) => void;
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
  setLiveActivity: (activity: LiveActivityState | null) => void;
  bumpLiveActivityUpdateAt: (at: number) => void;
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
  points: [],
  flushedPointCount: 0,
  totalDistanceM: 0,
  startedAt: null,
  events: [],
  trackingGeneration: 0,
  trackingCleanup: null,
  cameraRequestedAt: null,
  isMinimized: false,
  liveActivity: null,

  selectDog: (dogId) =>
    set((state) => ({
      selectedDogIds: state.selectedDogIds.includes(dogId)
        ? state.selectedDogIds.filter((id) => id !== dogId)
        : [...state.selectedDogIds, dogId],
    })),

  setSelectedDogs: (dogIds) => set({ selectedDogIds: dogIds }),

  startRecording: (walkId) =>
    set({ phase: 'recording', walkId, startedAt: new Date(), flushedPointCount: 0 }),

  addPoint: (point) =>
    set((state) => {
      const prev = state.points[state.points.length - 1];
      const added = prev ? haversineDistance(prev, point) : 0;
      return {
        points: [...state.points, point],
        totalDistanceM: state.totalDistanceM + added,
      };
    }),

  markFlushedPointCount: (count) =>
    set((state) => ({
      flushedPointCount: Math.min(state.points.length, Math.max(state.flushedPointCount, count)),
    })),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

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

  setLiveActivity: (activity) => set({ liveActivity: activity }),

  bumpLiveActivityUpdateAt: (at) =>
    set((state) =>
      state.liveActivity ? { liveActivity: { ...state.liveActivity, lastUpdateAt: at } } : {},
    ),

  finish: () => set({ phase: 'finished', cameraRequestedAt: null, isMinimized: false }),

  reset: () => {
    const cleanup = get().trackingCleanup;
    set({
      phase: 'ready',
      walkId: null,
      selectedDogIds: [],
      points: [],
      flushedPointCount: 0,
      totalDistanceM: 0,
      startedAt: null,
      events: [],
      trackingGeneration: 0,
      trackingCleanup: null,
      cameraRequestedAt: null,
      isMinimized: false,
      liveActivity: null,
    });
    clearTrackingCleanup(cleanup);
  },
}));
