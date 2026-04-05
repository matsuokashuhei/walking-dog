import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
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

export function DogStatsCard({ stats }: DogStatsCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  const minutes = Math.floor(stats.totalDurationSec / 60);
  const hours = Math.floor(minutes / 60);
  const durationText = hours > 0
    ? t('dogs.stats.hours', { hours, minutes: minutes % 60 })
    : t('dogs.stats.minutes', { count: minutes });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.border + '33',
        },
      ]}
    >
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
          {durationText}
        </Text>
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{t('dogs.stats.duration')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
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
    ...typography.label,
    marginTop: spacing.xs,
  },
});
