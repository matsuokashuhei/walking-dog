import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { elevation, radius, spacing, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { useRecordWalkEvent } from '@/hooks/use-walk-event-mutations';
import type { Dog } from '@/types/graphql';

interface WalkQuickActionsProps {
  dogs: Dog[];
}

// ミニ表示中でも使えるイベント記録ボタンです。犬の数に応じて表示粒度を切り替えます。
export function WalkQuickActions({ dogs }: WalkQuickActionsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const walkId = useWalkStore((s) => s.walkId);
  const points = useWalkStore((s) => s.points);
  const addEvent = useWalkStore((s) => s.addEvent);
  const recordWalkEvent = useRecordWalkEvent();
  const runWithAlert = useMutationWithAlert();
  const isSingleDog = dogs.length === 1;
  const latestPoint = points[points.length - 1];
  const isDisabled = !walkId || recordWalkEvent.isPending;

  // Pee/Poo は最新位置と一緒に API へ送り、成功したイベントをローカル store に反映します。
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

  // 犬が選ばれていない場合は、記録先がないためクイック操作を隠します。
  if (dogs.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {/* 単独犬はイベント名、複数犬は犬名を前面に出して誤記録を防ぎます。 */}
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

// クイック操作の各ボタンは、非同期処理でも Pressable 側へ Promise を漏らさないよう包みます。
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
    paddingHorizontal: spacing.step10,
    paddingVertical: spacing.step6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillCompact: { paddingHorizontal: spacing.sm },
  pillLabel: {
    ...typography.footnote,
    fontWeight: typography.headline.fontWeight,
  },
  disabled: { opacity: 0.4 },
});
