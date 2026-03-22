import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { WalkStats } from '@/types/graphql';

interface DogStatsCardProps {
  stats: WalkStats;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${meters} m`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}分`;
}

export function DogStatsCard({ stats }: DogStatsCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.primary }]}>{stats.totalWalks}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>散歩</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.primary }]}>
          {formatDistance(stats.totalDistanceM)}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>距離</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.primary }]}>
          {formatDuration(stats.totalDurationSec)}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>時間</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...typography.h3,
  },
  label: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  divider: {
    width: 1,
    marginHorizontal: spacing.sm,
  },
});
