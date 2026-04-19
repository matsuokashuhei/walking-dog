import { useCallback } from 'react';
import { startTracking } from '@/lib/walk/gps-tracker';
import {
  endLiveActivity,
  startLiveActivity,
  updateLiveActivityDistance,
} from '@/lib/walk/live-activity';
import { useWalkStore } from '@/stores/walk-store';
import { useAddWalkPoints, useFinishWalk, useStartWalk } from './use-walk-mutations';

// Server-side validation rejects payloads over ~200 points per addWalkPoints
// call (request size cap). Keep batches under this ceiling when flushing on stop.
export const MAX_POINTS_PER_BATCH = 200;

let activeTrackingCleanup: (() => void) | null = null;
let activeTrackingGeneration = 0;

function stopActiveTracking() {
  activeTrackingGeneration += 1;
  activeTrackingCleanup?.();
  activeTrackingCleanup = null;
}

export function resetWalkSessionTrackingState() {
  activeTrackingCleanup = null;
  activeTrackingGeneration = 0;
}

export interface WalkSessionStartOptions {
  selectedDogIds: string[];
  liveActivityDogName: string;
}

export function useWalkSession() {
  const startWalkMutation = useStartWalk();
  const finishWalkMutation = useFinishWalk();
  const addWalkPointsMutation = useAddWalkPoints();
  const startRecording = useWalkStore((s) => s.startRecording);
  const finish = useWalkStore((s) => s.finish);

  const start = useCallback(
    async ({ selectedDogIds, liveActivityDogName }: WalkSessionStartOptions): Promise<string> => {
      stopActiveTracking();

      const walk = await startWalkMutation.mutateAsync(selectedDogIds);
      startRecording(walk.id);

      await startLiveActivity({
        walkId: walk.id,
        dogId: selectedDogIds[0],
        dogName: liveActivityDogName,
        startedAt: useWalkStore.getState().startedAt ?? new Date(),
        distanceM: 0,
      });

      const trackingGeneration = activeTrackingGeneration;
      const stopTracking = await startTracking((point) => {
        if (trackingGeneration !== activeTrackingGeneration) return;
        if (useWalkStore.getState().phase !== 'recording') return;

        useWalkStore.getState().addPoint(point);
        void updateLiveActivityDistance(useWalkStore.getState().totalDistanceM);
      });

      if (trackingGeneration !== activeTrackingGeneration) {
        stopTracking();
        return walk.id;
      }

      activeTrackingCleanup = stopTracking;

      return walk.id;
    },
    [startWalkMutation, startRecording],
  );

  const stop = useCallback(
    async (walkId: string) => {
      stopActiveTracking();

      const currentPoints = useWalkStore.getState().points;
      for (let i = 0; i < currentPoints.length; i += MAX_POINTS_PER_BATCH) {
        const batch = currentPoints.slice(i, i + MAX_POINTS_PER_BATCH).map((p) => ({
          lat: p.lat,
          lng: p.lng,
          recordedAt: p.recordedAt,
        }));
        await addWalkPointsMutation.mutateAsync({ walkId, points: batch });
      }

      const totalDistanceM = useWalkStore.getState().totalDistanceM;
      await finishWalkMutation.mutateAsync({
        walkId,
        distanceM: Math.round(totalDistanceM),
      });
      finish();
      void endLiveActivity();
    },
    [addWalkPointsMutation, finishWalkMutation, finish],
  );

  return {
    start,
    stop,
    isStarting: startWalkMutation.isPending,
  };
}
