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
  flushPendingWalkPoints,
  MAX_POINTS_PER_BATCH,
  PERIODIC_FLUSH_INTERVAL_MS,
  resetWalkTrackingState,
  stopWalkTracking,
} from '@/lib/walk/tracking-manager';
import { useWalkStore } from '@/stores/walk-store';
import { useAddWalkPoints, useFinishWalk, useStartWalk } from './use-walk-mutations';

export { MAX_POINTS_PER_BATCH, PERIODIC_FLUSH_INTERVAL_MS };

// テストや再初期化時に、散歩トラッキング側の内部状態をリセットします。
export function resetWalkSessionTrackingState() {
  resetWalkTrackingState();
}

// 散歩開始時に必要な犬 ID と Live Activity 表示名です。
export interface WalkSessionStartOptions {
  selectedDogIds: string[];
  liveActivityDogName: string;
}

// 散歩の開始・終了、GPS トラッキング、Live Activity 更新を一括で管理します。
export function useWalkSession() {
  const startWalkMutation = useStartWalk();
  const finishWalkMutation = useFinishWalk();
  const addWalkPointsMutation = useAddWalkPoints();
  const startRecording = useWalkStore((s) => s.startRecording);
  const finish = useWalkStore((s) => s.finish);

  const start = useCallback(
    async ({ selectedDogIds, liveActivityDogName }: WalkSessionStartOptions): Promise<string> => {
      // 既存の GPS 監視を止めてから、新しい散歩と端末側の記録状態を開始します。
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
          // 初回の GPS 距離更新はデバウンスせず、すぐ Live Activity へ反映します。
          lastUpdateAt: 0,
        });
      }

      // GPS 点はストアへ即時反映し、永続化は tracking-manager 側のバッチ送信に任せます。
      await beginWalkTracking({
        walkId: walk.id,
        addWalkPoints: addWalkPointsMutation.mutateAsync,
        onPoint: (point) => {
          useWalkStore.getState().addPoint(point);
        },
        onDistanceChange: (distanceM) => {
          const la = useWalkStore.getState().liveActivity;
          if (!la) return;
          const now = Date.now();
          if (now - la.lastUpdateAt < UPDATE_DEBOUNCE_MS) return;
          // ネイティブ更新が遅い間に次の GPS tick が通らないよう、先に時刻を更新します。
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
      // 未送信の GPS 点を送ってから、サーバー上の散歩を終了状態にします。
      stopWalkTracking();

      const currentPoints = useWalkStore.getState().points;
      await flushPendingWalkPoints({
        walkId,
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
