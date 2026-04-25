import { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useCameraEventTrigger } from '@/hooks/use-camera-event-trigger';
import { useCommitWalkEvent } from '@/hooks/use-commit-walk-event';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { useWalkEventRecorder } from '@/hooks/use-walk-event-recorder';
import { useWalkStore } from '@/stores/walk-store';
import { spacing } from '@/theme/tokens';
import { EVENT_ORDER, UI_EVENT_EMOJIS, countEventsByType } from '@/lib/walk/events';
import { DogEventActionRow } from './DogEventActionRow';
import { EventPill } from './EventPill';
import type { Dog, WalkEventType } from '@/types/graphql';

interface WalkEventActionsProps {
  dogs: Dog[];
}

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

  const handlePeeOrPoo = useCallback(
    async (eventType: Extract<WalkEventType, 'pee' | 'poo'>, dogId?: string) => {
      await commitEvent(() => recordEvent(eventType, dogId));
    },
    [commitEvent, recordEvent],
  );

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

  useCameraEventTrigger({
    cameraRequestedAt,
    walkId,
    dogId: singleDogId,
    clearCameraRequest,
    triggerPhoto: handlePhoto,
  });

  const fire = useCallback(
    (type: WalkEventType, dogId?: string) => {
      if (type === 'photo') {
        void handlePhoto(dogId);
        return;
      }

      void handlePeeOrPoo(type, dogId);
    },
    [handlePhoto, handlePeeOrPoo],
  );

  if (dogs.length === 0) return null;

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
            pressedSurfaceColor={theme.surfaceContainerHigh}
            textColor={theme.onSurface}
            secondaryTextColor={theme.onSurfaceVariant}
            eventLabels={{
              pee: t('walk.event.pee'),
              poo: t('walk.event.poo'),
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
    gap: 0,
  },
});
