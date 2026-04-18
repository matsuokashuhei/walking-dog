import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { useRecordWalkEvent } from '@/hooks/use-walk-event-mutations';
import { usePhotoUpload, PhotoUploadError } from '@/hooks/use-photo-upload';
import type { Dog, WalkEvent, WalkEventType } from '@/types/graphql';

const EVENT_ORDER: { type: WalkEventType; emoji: string }[] = [
  { type: 'pee', emoji: '💧' },
  { type: 'poo', emoji: '💩' },
  { type: 'photo', emoji: '📷' },
];

interface WalkEventActionsProps {
  dogs: Dog[];
}

export function WalkEventActions({ dogs }: WalkEventActionsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const points = useWalkStore((s) => s.points);
  const events = useWalkStore((s) => s.events);
  const addEvent = useWalkStore((s) => s.addEvent);
  const cameraRequestedAt = useWalkStore((s) => s.cameraRequestedAt);
  const clearCameraRequest = useWalkStore((s) => s.clearCameraRequest);

  const recordWalkEvent = useRecordWalkEvent();
  const photoUpload = usePhotoUpload();

  const isSingleDog = dogs.length === 1;
  const singleDogId = isSingleDog ? dogs[0].id : undefined;
  const latestPoint = points[points.length - 1];
  const isDisabled = !walkId || recordWalkEvent.isPending || photoUpload.isPending;

  const handlePeeOrPoo = async (eventType: 'pee' | 'poo', dogId?: string) => {
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

  const handlePhoto = useCallback(
    async (dogId?: string) => {
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
    },
    [walkId, latestPoint, t, photoUpload, addEvent],
  );

  const cameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live Activity camera deep-link handling — unchanged from the previous design.
  useEffect(() => {
    if (!cameraRequestedAt || !walkId) return;
    clearCameraRequest();
    const launchAfterDelay = () => {
      cameraTimerRef.current = setTimeout(() => {
        void handlePhoto(singleDogId);
      }, 150);
    };
    const currentState = AppState.currentState;
    if (currentState === 'active') {
      launchAfterDelay();
    } else {
      const sub = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
          sub.remove();
          launchAfterDelay();
        }
      });
    }
    return () => {
      if (cameraTimerRef.current !== null) {
        clearTimeout(cameraTimerRef.current);
        cameraTimerRef.current = null;
      }
    };
  }, [cameraRequestedAt, walkId, handlePhoto, clearCameraRequest, singleDogId]);

  const fire = (type: WalkEventType, dogId?: string) => {
    if (type === 'photo') {
      void handlePhoto(dogId).catch((err) => console.error('walk event record failed', err));
    } else {
      void handlePeeOrPoo(type, dogId).catch((err) =>
        console.error('walk event record failed', err),
      );
    }
  };

  if (dogs.length === 0) return null;

  if (isSingleDog) {
    const counts = tallyByType(events);
    return (
      <View style={styles.singleRow}>
        {EVENT_ORDER.map(({ type, emoji }) => (
          <EventPill
            key={type}
            label={t(`walk.event.${type}`)}
            emoji={emoji}
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

  // Multi-dog: per-dog rows with compact icon buttons on the right.
  return (
    <View style={styles.multiList}>
      {dogs.map((dog, index) => {
        const counts = tallyByType(events, dog.id);
        return (
          <View
            key={dog.id}
            style={[
              styles.multiRow,
              index > 0 && {
                borderTopColor: theme.border,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Image
              source={dog.photoUrl ?? require('@/assets/images/icon.png')}
              style={styles.multiAvatar}
              contentFit="cover"
            />
            <View style={styles.multiText}>
              <Text style={[styles.multiName, { color: theme.onSurface }]} numberOfLines={1}>
                {dog.name}
              </Text>
              <Text style={[styles.multiCounts, { color: theme.onSurfaceVariant }]}>
                {`💧 ${counts.pee} · 💩 ${counts.poo}`}
              </Text>
            </View>
            <View style={styles.multiButtons}>
              {EVENT_ORDER.map(({ type, emoji }) => (
                <Pressable
                  key={type}
                  disabled={isDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${dog.name} ${t(`walk.event.${type}`)}`}
                  accessibilityState={{ disabled: isDisabled }}
                  onPress={() => fire(type, dog.id)}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      backgroundColor: pressed
                        ? theme.surfaceContainerHigh
                        : theme.surfaceContainer,
                    },
                    isDisabled && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.iconEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function tallyByType(events: WalkEvent[], dogId?: string) {
  const scoped = dogId ? events.filter((e) => e.dogId === dogId) : events;
  return {
    pee: scoped.filter((e) => e.eventType === 'pee').length,
    poo: scoped.filter((e) => e.eventType === 'poo').length,
    photo: scoped.filter((e) => e.eventType === 'photo').length,
  };
}

interface EventPillProps {
  label: string;
  emoji: string;
  count: number;
  disabled: boolean;
  onPress: () => void;
  background: string;
  labelColor: string;
  countColor: string;
}

function EventPill({
  label,
  emoji,
  count,
  disabled,
  onPress,
  background,
  labelColor,
  countColor,
}: EventPillProps) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: background, opacity: pressed ? 0.7 : 1 },
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text style={[styles.pillLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.pillCount, { color: countColor }]}>{count}</Text>
    </Pressable>
  );
}

const ICON_SIZE = 36;

const styles = StyleSheet.create({
  singleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    gap: 6,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    justifyContent: 'center',
  },
  pillEmoji: { fontSize: 16 },
  pillLabel: {
    ...typography.footnote,
    fontWeight: '600',
  },
  pillCount: {
    ...typography.footnote,
    fontWeight: '400',
    marginLeft: 2,
  },
  multiList: {
    gap: 0,
  },
  multiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  multiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  multiText: {
    flex: 1,
    minWidth: 0,
  },
  multiName: {
    ...typography.subheadline,
    fontWeight: '600',
  },
  multiCounts: {
    ...typography.caption,
    marginTop: 1,
  },
  multiButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 16 },
  buttonDisabled: { opacity: 0.4 },
});
