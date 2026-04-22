import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { elevation, radius, spacing, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { useRecordWalkEvent } from '@/hooks/use-walk-event-mutations';
import { usePhotoUpload, PhotoUploadError } from '@/hooks/use-photo-upload';
import type { Dog } from '@/types/graphql';

interface WalkQuickActionsProps {
  dogs: Dog[];
}

/**
 * Compact floating event pills shown above the minimized walk panel.
 * Single dog → Pee / Poop pills (labelled) + Photo icon.
 * Multi dog → `💧 <name>` + `💩 <name>` per dog + one shared Photo icon.
 */
export function WalkQuickActions({ dogs }: WalkQuickActionsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const points = useWalkStore((s) => s.points);
  const addEvent = useWalkStore((s) => s.addEvent);
  const recordWalkEvent = useRecordWalkEvent();
  const photoUpload = usePhotoUpload();
  const runWithAlert = useMutationWithAlert();
  const isSingleDog = dogs.length === 1;
  const latestPoint = points[points.length - 1];
  const isDisabled = !walkId || recordWalkEvent.isPending || photoUpload.isPending;

  const handlePeeOrPoo = useCallback(
    async (eventType: 'pee' | 'poo', dogId?: string) => {
      if (!walkId) return;
      const input = {
        walkId,
        dogId,
        eventType,
        occurredAt: new Date().toISOString(),
        ...(latestPoint ? { lat: latestPoint.lat, lng: latestPoint.lng } : {}),
      };
      const event = await runWithAlert(
        () => recordWalkEvent.mutateAsync(input),
        'walk.event.recordError',
        { action: 'recordWalkEvent', dogId, eventType, source: 'WalkQuickActions' },
      );
      if (!event) return;

      addEvent(event);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [walkId, latestPoint, recordWalkEvent, addEvent, runWithAlert],
  );

  const handlePhoto = useCallback(
    async (dogId?: string) => {
      if (!walkId) return;
      const permission = await runWithAlert(
        () => ImagePicker.requestCameraPermissionsAsync(),
        'walk.event.cameraPermissionError',
        { action: 'requestCameraPermission', dogId, source: 'WalkQuickActions' },
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
        { action: 'launchCamera', dogId, source: 'WalkQuickActions' },
      );
      if (!result || result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const event = await runWithAlert(
        () =>
          photoUpload.uploadPhoto({
            walkId,
            dogId,
            asset: { uri: asset.uri, mimeType: asset.mimeType },
            ...(latestPoint
              ? { latestPoint: { lat: latestPoint.lat, lng: latestPoint.lng } }
              : {}),
          }),
        (err) => {
          const phase = err instanceof PhotoUploadError ? err.phase : 'record';
          return {
            presign: 'walk.event.photoPresignError' as const,
            upload: 'walk.event.photoUploadError' as const,
            record: 'walk.event.recordError' as const,
          }[phase];
        },
        { action: 'uploadWalkPhoto', dogId, source: 'WalkQuickActions' },
      );
      if (!event) return;

      addEvent(event);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [walkId, latestPoint, t, photoUpload, addEvent, runWithAlert],
  );

  if (dogs.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {isSingleDog ? (
        <>
          <Pill
            label={`💧 ${t('walk.event.pee')}`}
            onPress={() => handlePeeOrPoo('pee', dogs[0].id)}
            disabled={isDisabled}
            bg={theme.surface}
            border={theme.border}
            color={theme.onSurface}
            accessibilityLabel={`${dogs[0].name} ${t('walk.event.pee')}`}
          />
          <Pill
            label={`💩 ${t('walk.event.poo')}`}
            onPress={() => handlePeeOrPoo('poo', dogs[0].id)}
            disabled={isDisabled}
            bg={theme.surface}
            border={theme.border}
            color={theme.onSurface}
            accessibilityLabel={`${dogs[0].name} ${t('walk.event.poo')}`}
          />
        </>
      ) : (
        dogs.flatMap((dog) => [
          <Pill
            key={`pee-${dog.id}`}
            label={`💧 ${dog.name}`}
            onPress={() => handlePeeOrPoo('pee', dog.id)}
            disabled={isDisabled}
            bg={theme.surface}
            border={theme.border}
            color={theme.onSurface}
            accessibilityLabel={`${dog.name} ${t('walk.event.pee')}`}
          />,
          <Pill
            key={`poo-${dog.id}`}
            label={`💩 ${dog.name}`}
            onPress={() => handlePeeOrPoo('poo', dog.id)}
            disabled={isDisabled}
            bg={theme.surface}
            border={theme.border}
            color={theme.onSurface}
            accessibilityLabel={`${dog.name} ${t('walk.event.poo')}`}
          />,
        ])
      )}
      <Pill
        label="📷"
        onPress={() => handlePhoto(isSingleDog ? dogs[0].id : undefined)}
        disabled={isDisabled}
        bg={theme.surface}
        border={theme.border}
        color={theme.onSurface}
        accessibilityLabel={t('walk.event.photo')}
        compact
      />
    </ScrollView>
  );
}

interface PillProps {
  label: string;
  onPress: () => void | Promise<void>;
  disabled: boolean;
  bg: string;
  border: string;
  color: string;
  accessibilityLabel: string;
  compact?: boolean;
}

function Pill({ label, onPress, disabled, bg, border, color, accessibilityLabel, compact }: PillProps) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={() => {
        void onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        compact && styles.pillCompact,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.85 : 1,
        },
        elevation.low,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillCompact: { paddingHorizontal: spacing.sm },
  pillLabel: {
    ...typography.footnote,
    fontWeight: '600',
  },
  disabled: { opacity: 0.4 },
});
