import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { usePackProgress } from '@/hooks/use-pack-progress';
import { radius, spacing, typography } from '@/theme/tokens';

interface StatCell {
  label: string;
  value: string;
  icon?: string;
}

export function WalkReadyStatsRow() {
  const { t } = useTranslation();
  const theme = useColors();
  const pack = usePackProgress();

  const cells: StatCell[] = [
    {
      label: t('walk.ready.stats.today'),
      value: t('walk.ready.stats.kmShort', { value: pack.todayKm.toFixed(2) }),
    },
    {
      label: t('walk.ready.stats.streak'),
      value: t('walk.ready.stats.streakDays', { count: pack.packStreakDays }),
      icon: '🔥',
    },
    {
      label: t('walk.ready.stats.goal'),
      value: t('walk.ready.stats.goalPercent', { value: pack.progressPct }),
    },
  ];

  return (
    <View style={[styles.row, { backgroundColor: theme.surfaceContainer }]}>
      {cells.map((cell) => (
        <View key={cell.label} style={styles.cell}>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>{cell.label}</Text>
          <Text style={[styles.value, { color: theme.onSurface }]} numberOfLines={1}>
            {cell.icon ? <Text style={styles.icon}>{cell.icon} </Text> : null}
            {cell.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    paddingVertical: spacing.step12,
    paddingHorizontal: spacing.sm,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    ...typography.title2,
    fontSize: 20,
    lineHeight: 24,
  },
  icon: {
    fontSize: 14,
  },
});
