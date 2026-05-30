import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { OwnerAvatar } from '@/components/settings/OwnerAvatar';
import { useColors } from '@/hooks/use-colors';
import { useOwnerProfileViewModel } from '@/hooks/use-owner-profile-view-model';
import { components, spacing, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const vm = useOwnerProfileViewModel();

  if (vm.status === 'loading') return <LoadingScreen />;
  if (vm.status === 'error') {
    return (
      <ErrorScreen
        message={t('settings.profile.loadError')}
        onRetry={vm.handleRetry}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('settings.profile.title')}
        leftAction={{ label: t('settings.profile.back'), onPress: () => router.back() }}
        rightAction={{
          label: t('settings.profile.edit'),
          onPress: () => router.push('/settings/profile/edit'),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <OwnerAvatar
            displayName={vm.displayName}
            avatarUrl={vm.avatarUrl}
            size="profile"
            testID="owner-profile-avatar"
          />
          <Text style={[styles.name, { color: theme.onSurface }]} numberOfLines={1}>
            {vm.displayName}
          </Text>
          <Text style={[styles.since, { color: theme.onSurfaceVariant }]}>
            {vm.walkingSince}
          </Text>
        </View>

        <GroupedCard elevated={false} style={styles.statsCard}>
          {vm.metrics.map((metric, index) => (
            <View key={metric.key} style={styles.metricWithDivider}>
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: theme.onSurface }]}>
                  {metric.value}
                </Text>
                <Text style={[styles.metricLabel, { color: theme.onSurfaceVariant }]}>
                  {metric.label}
                </Text>
              </View>
              {index < vm.metrics.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
            </View>
          ))}
        </GroupedCard>

        <GroupedCard elevated={false} style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <Text style={[styles.weekTitle, { color: theme.onSurface }]}>
              {vm.week.title}
            </Text>
            <Text style={[styles.weekTotal, { color: theme.onSurfaceVariant }]}>
              {vm.week.totalLabel}
            </Text>
          </View>
          <View style={styles.chart}>
            {vm.week.days.map((day) => {
              const barHeight =
                day.distanceKm > 0
                  ? Math.max(
                      components.ownerProfileChart.minBarHeight,
                      day.progress * components.ownerProfileChart.maxBarHeight,
                    )
                  : components.ownerProfileChart.minBarHeight;
              return (
                <View key={day.key} style={styles.chartColumn}>
                  <Text style={[styles.chartValue, { color: theme.onSurfaceVariant }]}>
                    {day.valueLabel}
                  </Text>
                  <View
                    testID={`owner-profile-week-bar-${day.key}`}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
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
    height: components.ownerProfileChart.height,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: components.ownerProfileChart.gap,
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
