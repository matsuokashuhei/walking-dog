import { create } from 'zustand';
import { haversineDistance } from '@/lib/walk/distance';
import type { WalkPoint } from '@/types/graphql';

type WalkPhase = 'ready' | 'recording' | 'finished';

interface WalkState {
  phase: WalkPhase;
  walkId: string | null;
  selectedDogIds: string[];
  points: WalkPoint[];
  totalDistanceM: number;
  startedAt: Date | null;
  selectDog: (dogId: string) => void;
  startRecording: (walkId: string) => void;
  addPoint: (point: WalkPoint) => void;
  finish: () => void;
  reset: () => void;
}

export const useWalkStore = create<WalkState>((set, get) => ({
  phase: 'ready',
  walkId: null,
  selectedDogIds: [],
  points: [],
  totalDistanceM: 0,
  startedAt: null,

  selectDog: (dogId) =>
    set((state) => ({
      selectedDogIds: state.selectedDogIds.includes(dogId)
        ? state.selectedDogIds.filter((id) => id !== dogId)
        : [...state.selectedDogIds, dogId],
    })),

  startRecording: (walkId) =>
    set({ phase: 'recording', walkId, startedAt: new Date() }),

  addPoint: (point) =>
    set((state) => {
      const prev = state.points[state.points.length - 1];
      const added = prev ? haversineDistance(prev, point) : 0;
      return {
        points: [...state.points, point],
        totalDistanceM: state.totalDistanceM + added,
      };
    }),

  finish: () => set({ phase: 'finished' }),

  reset: () =>
    set({
      phase: 'ready',
      walkId: null,
      selectedDogIds: [],
      points: [],
      totalDistanceM: 0,
      startedAt: null,
    }),
}));
