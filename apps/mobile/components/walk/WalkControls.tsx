import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatTime, formatDistance } from '@/lib/walk/format';

interface WalkControlsProps {
  onStop: () => void;
  isStopping: boolean;
}

export function WalkControls({ onStop, isStopping }: WalkControlsProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
    <View style={styles.container}>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatTime(elapsedSec)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('walk.recording.time')}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatDistance(totalDistanceM)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('walk.recording.distance')}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.recording.stop')}
        onPress={onStop}
        disabled={isStopping}
        style={[styles.stopButton, { opacity: isStopping ? 0.7 : 1 }]}
      >
        <View style={styles.stopIcon} />
        <Text style={styles.stopText}>{t('walk.recording.stop')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg },
  stats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { ...typography.caption, marginTop: spacing.xs },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stopText: { color: '#fff', ...typography.caption, marginTop: spacing.xs },
});
