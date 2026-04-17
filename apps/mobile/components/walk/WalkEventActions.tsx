import { useCallback, useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { useRecordWalkEvent } from '@/hooks/use-walk-event-mutations';
import { usePhotoUpload, PhotoUploadError } from '@/hooks/use-photo-upload';
import type { WalkEventType } from '@/types/graphql';

const EVENT_BUTTONS: { type: WalkEventType; emoji: string }[] = [
  { type: 'pee', emoji: '🚽' },
  { type: 'poo', emoji: '💩' },
  { type: 'photo', emoji: '📷' },
];

export function WalkEventActions() {
  const { t } = useTranslation();
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const points = useWalkStore((s) => s.points);
  const addEvent = useWalkStore((s) => s.addEvent);
  const cameraRequestedAt = useWalkStore((s) => s.cameraRequestedAt);
  const clearCameraRequest = useWalkStore((s) => s.clearCameraRequest);

  const recordWalkEvent = useRecordWalkEvent();
  const photoUpload = usePhotoUpload();

  const dogId = selectedDogIds.length === 1 ? selectedDogIds[0] : undefined;
  const latestPoint = points[points.length - 1];

  const isDisabled = !walkId || recordWalkEvent.isPending || photoUpload.isPending;

  const handlePeeOrPoo = async (eventType: 'pee' | 'poo') => {
    if (!walkId) return;

    const input = {
      walkId,
      dogId,
      eventType,
      occurredAt: new Date().toISOString(),
      ...(latestPoint ? { lat: latestPoint.lat, lng: latestPoint.lng } : {}),
    };

    try {
      const event = await recordWalkEvent.mutateAsync(input);
      addEvent(event);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('walk event record failed', err);
      Alert.alert(t('common.error'), t('walk.event.recordError'));
    }
  };

  const handlePhoto = useCallback(async () => {
    if (!walkId) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('walk.event.cameraPermissionError'));
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const event = await photoUpload.uploadPhoto({
        walkId,
        dogId,
        asset: { uri: asset.uri, mimeType: asset.mimeType },
        ...(latestPoint
          ? { latestPoint: { lat: latestPoint.lat, lng: latestPoint.lng } }
          : {}),
      });

      addEvent(event);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('walk event record failed', err);
      const phase = err instanceof PhotoUploadError ? err.phase : 'record';
      const messageKey = {
        presign: 'walk.event.photoPresignError' as const,
        upload: 'walk.event.photoUploadError' as const,
        record: 'walk.event.recordError' as const,
      }[phase];
      Alert.alert(t('common.error'), t(messageKey));
    }
  }, [walkId, dogId, latestPoint, t, photoUpload, addEvent]);

  // Live Activity の Camera ボタン (deep link 経由) で walk-store の
  // cameraRequestedAt が更新されたら、アプリ内 Pee/Poo/Photo ボタンを
  // 押されたときと同じ handlePhoto を実行する。
  useEffect(() => {
    if (!cameraRequestedAt || !walkId) return;
    void handlePhoto();
    clearCameraRequest();
  }, [cameraRequestedAt, walkId, handlePhoto, clearCameraRequest]);

  const handlePress = (type: WalkEventType) => {
    if (type === 'photo') {
      void handlePhoto().catch((err) => {
        console.error('walk event record failed', err);
      });
    } else {
      void handlePeeOrPoo(type).catch((err) => {
        console.error('walk event record failed', err);
      });
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: theme.border + '33' }]}>
      {EVENT_BUTTONS.map(({ type, emoji }) => {
        const label = t(`walk.event.${type}`);
        return (
          <Pressable
            key={type}
            disabled={isDisabled}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: pressed ? theme.surfaceContainerHigh : theme.surfaceContainer },
              isDisabled && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: isDisabled }}
            onPress={() => handlePress(type)}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
