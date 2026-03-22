import { create } from 'zustand';
import type { GpsPoint } from '@/lib/walk/gps-tracker';

type WalkPhase = 'idle' | 'selecting' | 'recording' | 'finished';

interface WalkState {
  phase: WalkPhase;
  walkId: string | null;
  selectedDogIds: string[];
  points: GpsPoint[];
  distanceM: number;
  elapsedSec: number;
  startedAt: string | null;

  setPhase: (phase: WalkPhase) => void;
  setWalkId: (id: string) => void;
  setSelectedDogIds: (ids: string[]) => void;
  addPoint: (point: GpsPoint) => void;
  setElapsed: (sec: number) => void;
  reset: () => void;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const useWalkStore = create<WalkState>((set, get) => ({
  phase: 'idle',
  walkId: null,
  selectedDogIds: [],
  points: [],
  distanceM: 0,
  elapsedSec: 0,
  startedAt: null,

  setPhase: (phase) => set({ phase }),
  setWalkId: (id) => set({ walkId: id }),
  setSelectedDogIds: (ids) => set({ selectedDogIds: ids }),

  addPoint: (point) => {
    const { points, distanceM } = get();
    let newDistance = distanceM;
    if (points.length > 0) {
      const prev = points[points.length - 1];
      newDistance += haversineDistance(prev.lat, prev.lng, point.lat, point.lng);
    }
    set({
      points: [...points, point],
      distanceM: newDistance,
      startedAt: points.length === 0 ? point.recordedAt : get().startedAt,
    });
  },

  setElapsed: (sec) => set({ elapsedSec: sec }),

  reset: () =>
    set({
      phase: 'idle',
      walkId: null,
      selectedDogIds: [],
      points: [],
      distanceM: 0,
      elapsedSec: 0,
      startedAt: null,
    }),
}));
