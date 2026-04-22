import { useCallback } from 'react';
import {
  endLiveActivity,
  startLiveActivity,
  updateLiveActivityDistance,
} from '@/lib/walk/live-activity';
import {
  beginWalkTracking,
  flushWalkPoints,
  MAX_POINTS_PER_BATCH,
  resetWalkTrackingState,
  stopWalkTracking,
} from '@/lib/walk/tracking-manager';
import { useWalkStore } from '@/stores/walk-store';
import { useAddWalkPoints, useFinishWalk, useStartWalk } from './use-walk-mutations';

export { MAX_POINTS_PER_BATCH };

export function resetWalkSessionTrackingState() {
  resetWalkTrackingState();
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
      stopWalkTracking();

      const walk = await startWalkMutation.mutateAsync(selectedDogIds);
      startRecording(walk.id);

      await startLiveActivity({
        walkId: walk.id,
        dogId: selectedDogIds[0],
        dogName: liveActivityDogName,
        startedAt: useWalkStore.getState().startedAt ?? new Date(),
        distanceM: 0,
      });

      await beginWalkTracking({
        onPoint: (point) => {
          useWalkStore.getState().addPoint(point);
        },
        onDistanceChange: (distanceM) => {
          void updateLiveActivityDistance(distanceM);
        },
      });

      return walk.id;
    },
    [startWalkMutation, startRecording],
  );

  const stop = useCallback(
    async (walkId: string) => {
      stopWalkTracking();

      const currentPoints = useWalkStore.getState().points;
      await flushWalkPoints({
        walkId,
        points: currentPoints,
        addWalkPoints: addWalkPointsMutation.mutateAsync,
      });

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
