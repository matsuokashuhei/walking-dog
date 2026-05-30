import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { usePackProgress } from '@/hooks/use-pack-progress';
import { components, radius, spacing, typography } from '@/theme/tokens';

interface StatCell {
  label: string;
  value: string;
  icon?: string;
}

// 散歩開始前に、今日の距離・連続日数・目標進捗を小さくまとめて表示します。
export function WalkReadyStatsRow() {
  const { t } = useTranslation();
  const theme = useColors();
  const pack = usePackProgress();

  // pack progress の数値を、表示用の短い統計セルに変換します。
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
      value: t('walk.ready.stats.goalMinutes', {
        done: pack.todayMinutes,
        goal: pack.goalMinutes,
      }),
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
    gap: spacing.xs / 2,
  },
  label: {
    ...typography.metricLabel,
    fontWeight: typography.headline.fontWeight,
  },
  value: {
    ...typography.title2,
    fontSize: typography.title2.fontSize - spacing.xs / 2,
    lineHeight: spacing.lg,
  },
  icon: {
    fontSize: components.button.radius,
  },
});
