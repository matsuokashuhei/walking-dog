import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Walk } from '@/types/graphql';

interface WalkSummaryCardProps {
  walk: Walk;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function WalkSummaryCard({ walk }: WalkSummaryCardProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('walk.summary.title')}
      </Text>

      {walk.dogs.length > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('walk.summary.dogs')}
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {walk.dogs.map((d) => d.name).join(', ')}
          </Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('walk.summary.duration')}
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {walk.durationSec != null ? formatDuration(walk.durationSec) : '-'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('walk.summary.distance')}
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {walk.distanceM != null ? formatDistance(walk.distanceM) : '-'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.body,
  },
  value: {
    ...typography.bodyMedium,
  },
});
