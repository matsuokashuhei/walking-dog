import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatTime, formatDistance } from '@/lib/walk/format';

interface WalkControlsProps {
  onStop: () => void;
  isStopping: boolean;
}

export function WalkControls({ onStop, isStopping }: WalkControlsProps) {
  const theme = useColors();
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.timerSection}>
        <Text style={[styles.timerLabel, { color: theme.onSurfaceVariant }]}>DURATION</Text>
        <Text style={[styles.timerValue, { color: theme.onSurface }]}>
          {formatTime(elapsedSec)}
        </Text>
      </View>

      <View style={styles.metrics}>
        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: theme.surfaceContainerLowest,
              borderColor: theme.border + '33',
            },
          ]}
        >
          <Text style={[styles.metricValue, { color: theme.onSurface }]}>
            {formatDistance(totalDistanceM)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.onSurfaceVariant }]}>Distance</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stop"
        onPress={onStop}
        disabled={isStopping}
        accessibilityState={{ disabled: isStopping }}
        style={[
          styles.stopButton,
          { backgroundColor: theme.interactive, opacity: isStopping ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.stopText, { color: theme.onInteractive }]}>Stop</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg },
  timerSection: { alignItems: 'center', marginBottom: spacing.lg },
  timerLabel: {
    ...typography.label,
  },
  timerValue: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -1.28,
    fontVariant: ['tabular-nums'],
    lineHeight: 72,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  metricValue: { ...typography.h2 },
  metricLabel: { ...typography.label, marginTop: spacing.xs },
  stopButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  stopText: { ...typography.button },
});
