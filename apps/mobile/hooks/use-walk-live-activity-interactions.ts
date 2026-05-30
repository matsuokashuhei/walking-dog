import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { addUserInteractionListener } from 'expo-widgets';
import { useTranslation } from 'react-i18next';
import { useCommitWalkEvent } from '@/hooks/use-commit-walk-event';
import { useWalkEventRecorder } from '@/hooks/use-walk-event-recorder';
import { useWalkSession } from '@/hooks/use-walk-session';
import { handleWalkActivityTarget } from '@/lib/walk/live-activity-interactions';
import { useWalkStore } from '@/stores/walk-store';
import type { WalkActivityEventType } from '@/types/graphql';

// Live Activity のボタン操作を、記録画面と同じ散歩イベント/終了処理へ流します。
export function useWalkLiveActivityInteractions() {
  const { t } = useTranslation();
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const points = useWalkStore((s) => s.points);
  const walkSession = useWalkSession();
  const commitEvent = useCommitWalkEvent();
  const isFinishingRef = useRef(false);

  const latestPoint = useMemo(
    () =>
      points.length
        ? {
            lat: points[points.length - 1].lat,
            lng: points[points.length - 1].lng,
          }
        : undefined,
    [points],
  );

  const { recordEvent } = useWalkEventRecorder({
    walkId,
    latestPoint,
    source: 'WalkLiveActivity',
  });

  const recordActivityEvent = useCallback(
    async (eventType: WalkActivityEventType, dogId: string) => {
      if (phase !== 'recording') return;
      await commitEvent(() => recordEvent(eventType, dogId));
    },
    [commitEvent, phase, recordEvent],
  );

  const finishWalk = useCallback(async () => {
    if (!walkId || phase !== 'recording' || isFinishingRef.current) return;

    isFinishingRef.current = true;
    try {
      await walkSession.stop(walkId);
    } catch (error) {
      console.error('[walk.liveActivity.finish] failed', error);
      Alert.alert(t('common.error'), t('walk.error.finishFailed'));
    } finally {
      isFinishingRef.current = false;
    }
  }, [phase, t, walkId, walkSession]);

  useEffect(() => {
    const subscription = addUserInteractionListener((event) => {
      void handleWalkActivityTarget(event.target, {
        recordEvent: recordActivityEvent,
        finishWalk,
      });
    });

    return () => subscription.remove();
  }, [finishWalk, recordActivityEvent]);
}
