import { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useCameraEventTrigger } from '@/hooks/use-camera-event-trigger';
import { useCommitWalkEvent } from '@/hooks/use-commit-walk-event';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { useWalkEventRecorder } from '@/hooks/use-walk-event-recorder';
import { runDetached } from '@/lib/run-detached';
import { useWalkStore } from '@/stores/walk-store';
import { spacing } from '@/theme/tokens';
import { EVENT_ORDER, UI_EVENT_EMOJIS, countEventsByType } from '@/lib/walk/events';
import { DogEventActionRow } from './DogEventActionRow';
import { EventPill } from './EventPill';
import type { Dog, WalkEventType } from '@/types/graphql';

interface WalkEventActionsProps {
  dogs: Dog[];
}

// 記録中の Pee/Poo/Photo イベントを、単独犬と複数犬の UI に分けて提供します。
export function WalkEventActions({ dogs }: WalkEventActionsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const points = useWalkStore((s) => s.points);
  const events = useWalkStore((s) => s.events);
  const cameraRequestedAt = useWalkStore((s) => s.cameraRequestedAt);
  const clearCameraRequest = useWalkStore((s) => s.clearCameraRequest);
  const runWithAlert = useMutationWithAlert();
  const commitEvent = useCommitWalkEvent();

  const isSingleDog = dogs.length === 1;
  const singleDogId = isSingleDog ? dogs[0].id : undefined;
  // イベントには直近の GPS 座標を付与し、地図上のマーカーと履歴に反映できるようにします。
  const latestPoint = points.length
    ? {
        lat: points[points.length - 1].lat,
        lng: points[points.length - 1].lng,
      }
    : undefined;
  const { isPending, recordEvent, recordPhoto } = useWalkEventRecorder({
    walkId,
    latestPoint,
    source: 'WalkEventActions',
  });
  const isDisabled = !walkId || isPending;

  // 通常イベントは共通のイベント記録フックに委譲し、失敗時の復旧処理も同じ経路に寄せます。
  const handleActivityEvent = useCallback(
    async (eventType: Exclude<WalkEventType, 'photo'>, dogId?: string) => {
      await commitEvent(() => recordEvent(eventType, dogId));
    },
    [commitEvent, recordEvent],
  );

  // 写真イベントは権限確認、カメラ起動、アップロード付きイベント記録を順番に実行します。
  const handlePhoto = useCallback(
    async (dogId?: string) => {
      if (!walkId) return;

      const permission = await runWithAlert(
        () => ImagePicker.requestCameraPermissionsAsync(),
        'walk.event.cameraPermissionError',
        { action: 'requestCameraPermission', dogId, source: 'WalkEventActions' },
      );
      if (!permission) return;
      if (!permission.granted) {
        Alert.alert(t('common.error'), t('walk.event.cameraPermissionError'));
        return;
      }

      const result = await runWithAlert(
        () =>
          ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
          }),
        'walk.event.recordError',
        { action: 'launchCamera', dogId, source: 'WalkEventActions' },
      );
      if (!result || result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      await commitEvent(() =>
        recordPhoto({
          dogId,
          asset: { uri: asset.uri, mimeType: asset.mimeType },
        }),
      );
    },
    [walkId, t, runWithAlert, commitEvent, recordPhoto],
  );

  // 画面遷移時に渡されたカメラ起動要求を、記録画面の準備完了後に処理します。
  useCameraEventTrigger({
    cameraRequestedAt,
    walkId,
    dogId: singleDogId,
    clearCameraRequest,
    triggerPhoto: handlePhoto,
  });

  // UI 側はイベント種別だけを渡し、写真と通常イベントの実行経路をここで振り分けます。
  const fire = useCallback(
    (type: WalkEventType, dogId?: string) => {
      if (type === 'photo') {
        runDetached(handlePhoto(dogId), 'walk.event.photo');
        return;
      }

      runDetached(handleActivityEvent(type, dogId), 'walk.event.activity');
    },
    [handlePhoto, handleActivityEvent],
  );

  // 犬がいない状態ではイベントの紐付け先がないため、操作 UI を出しません。
  if (dogs.length === 0) return null;

  // 単独犬ではイベント種別ごとの横並びボタンで、現在回数も一緒に見せます。
  if (isSingleDog) {
    const counts = countEventsByType(events);
    return (
      <View style={styles.singleRow}>
        {EVENT_ORDER.map((type) => (
          <EventPill
            key={type}
            label={t(`walk.event.${type}`)}
            emoji={UI_EVENT_EMOJIS[type]}
            count={counts[type]}
            disabled={isDisabled}
            onPress={() => fire(type, singleDogId)}
            background={theme.surfaceContainer}
            labelColor={theme.onSurface}
            countColor={theme.onSurfaceVariant}
          />
        ))}
      </View>
    );
  }

  // 複数犬では犬ごとの行に分け、押した行の犬 ID へイベントを紐付けます。
  return (
    <View style={styles.multiList}>
      {dogs.map((dog, index) => {
        const counts = countEventsByType(events, { dogId: dog.id });
        return (
          <DogEventActionRow
            key={dog.id}
            dog={dog}
            counts={{ pee: counts.pee, poo: counts.poo }}
            disabled={isDisabled}
            borderTopColor={index > 0 ? theme.border : undefined}
            surfaceColor={theme.surfaceContainer}
            pressedSurfaceColor={theme.surfaceContainer}
            textColor={theme.onSurface}
            secondaryTextColor={theme.onSurfaceVariant}
            eventLabels={{
              pee: t('walk.event.pee'),
              poo: t('walk.event.poo'),
              sniff: t('walk.event.sniff'),
              greet: t('walk.event.greet'),
              photo: t('walk.event.photo'),
            }}
            onPress={fire}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  singleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  multiList: {
    gap: spacing.xs - spacing.xs,
  },
});
