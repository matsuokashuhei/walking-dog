import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { useWalkElapsed } from '@/hooks/use-walk-elapsed';
import { radius, spacing } from '@/theme/tokens';
import { useSettingsStore } from '@/stores/settings-store';
import { useWalkStore } from '@/stores/walk-store';
import { formatDistanceParts, formatPace, formatTime } from '@/lib/walk/format';
import { WalkControlsActions } from './WalkControlsActions';
import { WalkIdentityHeader } from './WalkIdentityHeader';
import { WalkMetricsRow } from './WalkMetricsRow';
import type { Dog } from '@/types/graphql';

interface WalkControlsProps {
  dogs: Dog[];
  onStop: () => void;
  isStopping: boolean;
  /** Pee/Poo/Photo controls — supplied by <WalkEventActions /> from walk.tsx. */
  children?: ReactNode;
}

export function WalkControls({ dogs, onStop, isStopping, children }: WalkControlsProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const startedAt = useWalkStore((s) => s.startedAt);
  const isPaused = useWalkStore((s) => s.isPaused);
  const totalPausedMs = useWalkStore((s) => s.totalPausedMs);
  const pauseStartedAtMs = useWalkStore((s) => s.pauseStartedAtMs);
  const togglePaused = useWalkStore((s) => s.togglePaused);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const units = useSettingsStore((s) => s.units);
  const elapsedSec = useWalkElapsed({
    startedAt,
    isPaused,
    totalPausedMs,
    pauseStartedAtMs,
  });

  const { value: distanceValue, unit: distanceUnit } = formatDistanceParts(totalDistanceM, units);
  const pace = formatPace(elapsedSec, totalDistanceM, units);
  const metrics = [
    { label: t('walk.recording.time'), value: formatTime(elapsedSec) },
    {
      label: t('walk.recording.distance'),
      value: distanceValue,
      unit: distanceUnit || undefined,
    },
    { label: t('walk.recording.pace'), value: pace.value, unit: pace.unit },
  ];

  const isSingleDog = dogs.length === 1;
  const title = isSingleDog ? dogs[0].name : dogs.map((d) => d.name).join(' + ');
  const subtitle = isSingleDog
    ? contextualWalkLabel(startedAt, t)
    : `${t('walk.recording.groupWalk')} · ${t('walk.recording.together')}`;

  return (
    <View
      testID="walk-controls-sheet"
      style={[
        styles.sheet,
        {
          backgroundColor: theme.material,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.grabberWrap}>
        <View testID="walk-controls-grabber" style={[styles.grabber, { backgroundColor: theme.onSurfaceVariant }]} />
      </View>
      <WalkIdentityHeader dogs={dogs} title={title} subtitle={subtitle} />
      <WalkMetricsRow metrics={metrics} />

      {children ? <View style={styles.slot}>{children}</View> : null}

      <WalkControlsActions
        isPaused={isPaused}
        isStopping={isStopping}
        onTogglePause={togglePaused}
        onStop={onStop}
      />
    </View>
  );
}

function contextualWalkLabel(startedAt: Date | null, t: (key: string) => string) {
  const hour = (startedAt ?? new Date()).getHours();
  if (hour < 12) return t('walk.recording.morningWalk');
  if (hour < 18) return t('walk.recording.afternoonWalk');
  return t('walk.recording.eveningWalk');
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: radius.full,
    opacity: 0.45,
  },
  slot: {
    marginBottom: spacing.lg,
  },
});
