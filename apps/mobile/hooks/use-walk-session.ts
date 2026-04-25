import { useCallback } from 'react';
import {
  endLiveActivity,
  startLiveActivity,
  updateLiveActivityDistance,
  UPDATE_DEBOUNCE_MS,
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

      const startedAt = useWalkStore.getState().startedAt ?? new Date();
      const activityId = await startLiveActivity({
        walkId: walk.id,
        dogId: selectedDogIds[0],
        dogName: liveActivityDogName,
        startedAt,
        distanceM: 0,
      });
      if (activityId) {
        useWalkStore.getState().setLiveActivity({
          activityId,
          startedAt,
          // 0 so the first GPS-driven distance update fires immediately rather
          // than being debounced for ~10 seconds.
          lastUpdateAt: 0,
        });
      }

      await beginWalkTracking({
        onPoint: (point) => {
          useWalkStore.getState().addPoint(point);
        },
        onDistanceChange: (distanceM) => {
          const la = useWalkStore.getState().liveActivity;
          if (!la) return;
          const now = Date.now();
          if (now - la.lastUpdateAt < UPDATE_DEBOUNCE_MS) return;
          // Bump first so a slow native update doesn't let a second GPS tick
          // through the gate while we're still in flight.
          useWalkStore.getState().bumpLiveActivityUpdateAt(now);
          void updateLiveActivityDistance(la.activityId, distanceM);
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

      const la = useWalkStore.getState().liveActivity;
      if (la) {
        useWalkStore.getState().setLiveActivity(null);
        void endLiveActivity(la.activityId);
      }
    },
    [addWalkPointsMutation, finishWalkMutation, finish],
  );

  return {
    start,
    stop,
    isStarting: startWalkMutation.isPending,
  };
}
