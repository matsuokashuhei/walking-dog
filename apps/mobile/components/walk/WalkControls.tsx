import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { OutlinedCard } from '@/components/ui/OutlinedCard';
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
        <OutlinedCard style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: theme.onSurface }]}>
            {formatDistance(totalDistanceM)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.onSurfaceVariant }]}>Distance</Text>
        </OutlinedCard>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Finish"
          onPress={onStop}
          disabled={isStopping}
          accessibilityState={{ disabled: isStopping }}
          style={[
            styles.finishButton,
            { backgroundColor: theme.interactive, opacity: isStopping ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.finishText, { color: theme.onInteractive }]}>Finish</Text>
        </Pressable>
      </View>
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
  },
  metricValue: { ...typography.h2 },
  metricLabel: { ...typography.label, marginTop: spacing.xs },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  finishButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  finishText: { ...typography.button },
});
