import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { OutlinedCard } from '@/components/ui/OutlinedCard';
import type { WalkStats } from '@/types/graphql';

interface DogStatsCardProps {
  stats: WalkStats;
  streakDays?: number;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${meters} m`;
}

export function DogStatsCard({ stats, streakDays = 0 }: DogStatsCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <OutlinedCard style={styles.card}>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: theme.onSurface }]}>{stats.totalWalks}</Text>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{t('dogs.stats.walks')}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: theme.onSurface }]}>
          {formatDistance(stats.totalDistanceM)}
        </Text>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{t('dogs.stats.distance')}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: theme.onSurface }]}>
          {t('dogs.detail.streakDays', { days: streakDays })}
        </Text>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
          {t('dogs.detail.streakLabel')}
        </Text>
      </View>
    </OutlinedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
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
    ...typography.label,
    marginTop: spacing.xs,
  },
});
