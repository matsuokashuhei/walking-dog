import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDogDetailViewModel } from '@/hooks/use-dog-detail-view-model';
import { WEEKLY_GOAL_CYCLE_DAYS } from '@/constants/walk';
import { DogHero } from '@/components/dogs/DogHero';
import { DogContactChromeButton } from '@/components/dogs/DogContactChromeButton';
import { GoalProgressCard } from '@/components/dogs/GoalProgressCard';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { DogWalksList } from '@/components/dogs/DogWalksList';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useColors } from '@/hooks/use-colors';
import { dogContactChrome, spacing, typography } from '@/theme/tokens';

// Lifts the name block into the hero's 60pt bottom fade without changing DogHero.
const NAME_OVERLAP = 50;
// Pins the absolute overlay to both screen edges.
const SCREEN_EDGE = 0;

// 犬詳細画面はヒーロー表示、散歩統計、散歩履歴、編集導線をまとめます。
export default function DogDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const vm = useDogDetailViewModel();
  const insets = useSafeAreaInsets();

  if (vm.status === 'loading') return <LoadingScreen />;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dogs');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
      >
        <DogHero photoUrl={vm.dog.photoUrl} />
        <View testID="dog-detail-header-large-title-row" style={styles.nameBlock}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.dogName, { color: theme.onSurface }]}
          >
            {vm.dog.name}
          </Text>
          {vm.meta ? (
            <Text style={[styles.dogMeta, { color: theme.onSurfaceVariant }]}>{vm.meta}</Text>
          ) : null}
        </View>

        {/* 散歩取得に失敗しているときは 0/0/0 の誤った統計を出さず、エラーだけ見せます。 */}
        {vm.dog.walkStats && !vm.walksError ? (
          <View testID="dog-detail-stats-section" style={styles.statsSection}>
            <DogStatsCard stats={vm.dog.walkStats} streakDays={vm.streakDays} />
          </View>
        ) : null}

        {!vm.walksError ? (
          <View
            testID="dog-detail-goal-progress-section"
            style={styles.goalProgressSection}
          >
            <GoalProgressCard
              title={t('dogs.detail.goalProgressTitle')}
              subtitle={t(
                vm.goalProgress.goalCycleDays === WEEKLY_GOAL_CYCLE_DAYS
                  ? 'dogs.detail.goalProgressWeekly'
                  : 'dogs.detail.goalProgressDaily',
                {
                  minutes: vm.goalProgress.progressMinutes,
                  goal: vm.goalProgress.goalMinutes,
                },
              )}
              progressPct={vm.goalProgress.progressPct}
            />
          </View>
        ) : null}

        <View testID="dog-detail-walks-section" style={styles.walksSection}>
          <DogWalksList
            walks={vm.dogWalks}
            onPressWalk={vm.handleOpenWalk}
            error={vm.walksError}
            onRetry={vm.retryWalks}
          />
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        testID="dog-detail-header"
        style={[styles.headerOverlay, { top: insets.top }]}
      >
        <View
          pointerEvents="box-none"
          testID="dog-detail-header-action-row"
          style={styles.headerActionRow}
        >
          <DogContactChromeButton
            shape="circle"
            accessibilityLabel={t('dogs.detail.back')}
            label={t('dogs.detail.back')}
            onPress={handleBack}
            iconName="chevron.backward"
            testID="dog-detail-back-button"
          />

          <DogContactChromeButton
            shape="pill"
            accessibilityLabel={t('dogs.detail.edit')}
            label={t('dogs.detail.edit')}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/dogs/[id]/edit',
                params: { id: vm.dog.id },
              })
            }
            testID="dog-detail-edit-button"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingBottom: spacing.xxl,
  },
  nameBlock: {
    paddingHorizontal: spacing.step20,
    marginTop: -NAME_OVERLAP,
  },
  dogName: {
    ...typography.largeTitle,
  },
  dogMeta: {
    ...typography.subheadline,
    marginTop: spacing.xs / 2,
  },
  statsSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  goalProgressSection: {
    paddingHorizontal: spacing.md,
  },
  walksSection: {
    paddingHorizontal: spacing.md,
  },
  headerOverlay: {
    position: 'absolute',
    left: SCREEN_EDGE,
    right: SCREEN_EDGE,
    height: dogContactChrome.circleSize,
  },
  headerActionRow: {
    height: dogContactChrome.circleSize,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
