import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

interface WalkControlsProps {
  elapsedSec: number;
  distanceM: number;
  onFinish: () => void;
  loading?: boolean;
}

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function WalkControls({
  elapsedSec,
  distanceM,
  onFinish,
  loading = false,
}: WalkControlsProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('walk.elapsed')}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatElapsed(elapsedSec)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('walk.distance')}
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatDistance(distanceM)}
          </Text>
        </View>
      </View>
      <Button
        label={t('walk.finishWalk')}
        variant="destructive"
        onPress={onFinish}
        loading={loading}
        accessibilityLabel={t('walk.finishWalk')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: 1,
    height: 40,
  },
});
