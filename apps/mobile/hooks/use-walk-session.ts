import { useCallback } from 'react';
import {
  beginWalkTracking,
  flushPendingWalkPoints,
  resetWalkTrackingState,
  stopWalkTracking,
} from '@/lib/walk/tracking-manager';
import { buildWalkActivityProps } from '@/lib/walk/live-activity';
import { endWalkLiveActivity, startWalkLiveActivity } from '@/lib/walk/live-activity-controller';
import { useWalkStore } from '@/stores/walk-store';
import { useAddWalkPoints, useFinishWalk, useStartWalk } from './use-walk-mutations';

// テストや再初期化時に、散歩トラッキング側の内部状態をリセットします。
export function resetWalkSessionTrackingState() {
  resetWalkTrackingState();
}

async function endLiveActivityAfterSavedWalk() {
  try {
    await endWalkLiveActivity();
  } catch (error) {
    console.error('[walk.liveActivity.end] failed after walk was saved', error);
  }
}

// 散歩開始時に必要な犬 ID です。
export interface WalkSessionStartOptions {
  selectedDogIds: string[];
  backgroundLocationEnabled?: boolean;
}

// 散歩の開始・終了、GPS トラッキングを一括で管理します。
export function useWalkSession() {
  const startWalkMutation = useStartWalk();
  const finishWalkMutation = useFinishWalk();
  const addWalkPointsMutation = useAddWalkPoints();
  const startRecording = useWalkStore((s) => s.startRecording);
  const finish = useWalkStore((s) => s.finish);

  const start = useCallback(
    async ({
      selectedDogIds,
      backgroundLocationEnabled = false,
    }: WalkSessionStartOptions): Promise<string> => {
      // 既存の GPS 監視を止めてから、新しい散歩と端末側の記録状態を開始します。
      await stopWalkTracking();

      const walk = await startWalkMutation.mutateAsync(selectedDogIds);
      const startedAt = new Date(walk.startedAt);
      startRecording(walk.id, {
        startedAt,
        selectedDogIds,
        dogs: walk.dogs,
        points: walk.points ?? [],
        totalDistanceM: walk.distanceM ?? walk.distance ?? 0,
        events: walk.events ?? [],
      });

      await startWalkLiveActivity(
        buildWalkActivityProps({
          walkId: walk.id,
          startedAt,
          distanceM: walk.distanceM ?? walk.distance ?? 0,
          dogs: walk.dogs,
          events: [],
        }),
      );

      // GPS 点はストアへ即時反映し、永続化とローカル距離更新も同じ点列から行います。
      // サーバ側の再計算値は walk-recording.tsx のポーリングで上書きされます。
      await beginWalkTracking({
        walkId: walk.id,
        addWalkPoints: addWalkPointsMutation.mutateAsync,
        backgroundLocationEnabled,
        onPoint: (point) => {
          useWalkStore.getState().addPoint(point);
        },
      });

      return walk.id;
    },
    [addWalkPointsMutation, startWalkMutation, startRecording],
  );

  const stop = useCallback(
    async (walkId: string) => {
      // 未送信の GPS 点を送ってから、サーバー上の散歩を終了状態にします。
      // distance はサーバ側で track_point から算出して保存されるため、ここでは送りません。
      await stopWalkTracking();

      await flushPendingWalkPoints({
        walkId,
        addWalkPoints: addWalkPointsMutation.mutateAsync,
      });

      await finishWalkMutation.mutateAsync({ walkId });
      finish();
      await endLiveActivityAfterSavedWalk();
    },
    [addWalkPointsMutation, finishWalkMutation, finish],
  );

  return {
    start,
    stop,
    isStarting: startWalkMutation.isPending,
  };
}
