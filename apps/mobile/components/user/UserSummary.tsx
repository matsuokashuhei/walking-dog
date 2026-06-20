import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useColors } from '@/hooks/use-colors';
import type { UserReadyViewModel } from '@/hooks/use-user-screen-view-model';
import { components, spacing, typography } from '@/theme/tokens';

interface UserSummaryProps {
  user: UserReadyViewModel;
  footer?: ReactNode;
}

export function UserSummary({ user, footer }: UserSummaryProps) {
  const theme = useColors();

  return (
    <>
      <View style={styles.identity}>
        <UserAvatar
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          size="display"
          testID="user-avatar"
        />
        <Text style={[styles.name, { color: theme.onSurface }]} numberOfLines={1}>
          {user.displayName}
        </Text>
        <Text style={[styles.email, { color: theme.onSurfaceVariant }]} numberOfLines={1}>
          {user.email}
        </Text>
        <Text style={[styles.since, { color: theme.onSurfaceVariant }]}>
          {user.walkingSince}
        </Text>
      </View>

      <GroupedCard elevated={false} style={styles.statsCard}>
        {user.metrics.map((metric, index) => (
          <View key={metric.key} style={styles.metricWithDivider}>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: theme.onSurface }]}>
                {metric.value}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.onSurfaceVariant }]}>
                {metric.label}
              </Text>
            </View>
            {index < user.metrics.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            ) : null}
          </View>
        ))}
      </GroupedCard>

      <GroupedCard elevated={false} style={styles.weekCard}>
        <View style={styles.weekHeader}>
          <Text style={[styles.weekTitle, { color: theme.onSurface }]}>
            {user.week.title}
          </Text>
          <Text style={[styles.weekTotal, { color: theme.onSurfaceVariant }]}>
            {user.week.totalLabel}
          </Text>
        </View>
        <View style={styles.chart}>
          {user.week.days.map((day) => {
            const barHeight =
              day.distanceKm > 0
                ? Math.max(
                    components.userWalkChart.minBarHeight,
                    day.progress * components.userWalkChart.maxBarHeight,
                  )
                : components.userWalkChart.minBarHeight;
            return (
              <View key={day.key} style={styles.chartColumn}>
                <Text style={[styles.chartValue, { color: theme.onSurfaceVariant }]}>
                  {day.valueLabel}
                </Text>
                <View
                  testID={`user-week-bar-${day.key}`}
                  style={[
                    styles.chartBar,
                    {
                      height: barHeight,
                      backgroundColor: day.isToday
                        ? theme.success
                        : day.distanceKm > 0
                          ? theme.interactive
                          : theme.surfaceContainer,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.chartLabel,
                    { color: day.isToday ? theme.onSurface : theme.onSurfaceVariant },
                  ]}
                >
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>
      </GroupedCard>

      {footer}
    </>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  name: {
    ...typography.title2,
    marginTop: spacing.step12,
  },
  since: {
    ...typography.footnote,
    marginTop: spacing.xs,
  },
  email: {
    ...typography.footnote,
    marginTop: spacing.xs,
  },
  statsCard: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  metricWithDivider: {
    flex: 1,
    flexDirection: 'row',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    ...typography.title2,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    ...typography.metricLabel,
    marginTop: spacing.xs / 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  weekCard: {
    padding: spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.step14,
  },
  weekTitle: {
    ...typography.subheadline,
    fontWeight: typography.headline.fontWeight,
  },
  weekTotal: {
    ...typography.footnote,
  },
  chart: {
    height: components.userWalkChart.height,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: components.userWalkChart.gap,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.step6,
  },
  chartValue: {
    ...typography.metricLabel,
    fontWeight: typography.headline.fontWeight,
  },
  chartBar: {
    width: '100%',
    borderRadius: spacing.xs,
  },
  chartLabel: {
    ...typography.metricLabel,
    fontWeight: components.metric.unitFontWeight,
  },
});
