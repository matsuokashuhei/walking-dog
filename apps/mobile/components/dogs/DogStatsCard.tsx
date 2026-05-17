import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { formatDistance } from '@/lib/walk/format';
import type { WalkStats } from '@/types/graphql';

interface DogStatsCardProps {
  stats: WalkStats;
  streakDays?: number;
}

export function DogStatsCard({ stats, streakDays = 0 }: DogStatsCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <GroupedCard elevated testID="dog-stats-card" style={styles.card}>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: theme.onSurface }]}>{stats.totalWalks}</Text>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{t('dogs.stats.walks')}</Text>
      </View>
      <View testID="dog-stats-card-divider" style={[styles.divider, { backgroundColor: theme.border }]} />
      <View style={styles.stat}>
        <Text style={[styles.value, { color: theme.onSurface }]}>
          {formatDistance(stats.totalDistanceM, 'km', 1)}
        </Text>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{t('dogs.stats.distance')}</Text>
      </View>
      <View testID="dog-stats-card-divider" style={[styles.divider, { backgroundColor: theme.border }]} />
      <View style={styles.stat}>
        <Text style={[styles.value, { color: theme.onSurface }]}>
          {t('dogs.detail.streakDays', { days: streakDays })}
        </Text>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
          {t('dogs.detail.streakLabel')}
        </Text>
      </View>
    </GroupedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingVertical: spacing.step14,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...typography.title2,
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...typography.metricLabel,
    marginTop: spacing.xs / 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
});
