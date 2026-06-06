import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDogDetailViewModel } from '@/hooks/use-dog-detail-view-model';
import { DogHero } from '@/components/dogs/DogHero';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { DogWalksList } from '@/components/dogs/DogWalksList';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { layout, spacing, typography } from '@/theme/tokens';

// Hardcoded for legibility over arbitrary user photos; this chrome must stay
// pure white regardless of the active color scheme.
const OVERLAY_TEXT = '#FFFFFF';
const OVERLAY_SHADOW_OFFSET_X = 0;
const OVERLAY_SHADOW_OFFSET_Y = 1;
const OVERLAY_TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.3)',
  textShadowOffset: { width: OVERLAY_SHADOW_OFFSET_X, height: OVERLAY_SHADOW_OFFSET_Y },
  textShadowRadius: spacing.xs,
} as const;

// Lifts the name block into the hero's 60pt bottom fade without changing DogHero.
const NAME_OVERLAP = 50;
// Pins the absolute overlay to both screen edges.
const SCREEN_EDGE = 0;

// 犬詳細画面はヒーロー表示、散歩統計、散歩履歴、編集/削除操作をまとめます。
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
          <View style={styles.statsSection}>
            <DogStatsCard stats={vm.dog.walkStats} streakDays={vm.streakDays} />
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

        <View style={styles.actions}>
          <Button
            label={t('dogs.detail.delete')}
            variant="destructive"
            onPress={vm.openDeleteConfirm}
            style={styles.actionButton}
          />
        </View>

        <ConfirmDialog
          visible={vm.showDeleteConfirm}
          title={t('dogs.detail.deleteTitle')}
          message={t('dogs.detail.deleteConfirm', { name: vm.dog.name })}
          confirmLabel={t('dogs.detail.delete')}
          onConfirm={vm.handleDelete}
          onCancel={vm.closeDeleteConfirm}
          destructive
        />
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dogs.detail.back')}
            hitSlop={spacing.step12}
            onPress={handleBack}
            style={styles.headerLeft}
          >
            <IconSymbol
              name="chevron.backward"
              size={typography.body.fontSize}
              color={OVERLAY_TEXT}
            />
            <Text style={styles.headerText}>{t('dogs.detail.back')}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dogs.detail.edit')}
            hitSlop={spacing.step12}
            onPress={() =>
              router.push({
                pathname: '/dogs/[id]/edit',
                params: { id: vm.dog.id },
              })
            }
            style={styles.headerRight}
          >
            <Text style={styles.headerText}>{t('dogs.detail.edit')}</Text>
          </Pressable>
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
  walksSection: {
    paddingHorizontal: spacing.md,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  actionButton: {
    width: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    left: SCREEN_EDGE,
    right: SCREEN_EDGE,
    height: layout.navBar,
  },
  headerActionRow: {
    height: layout.navBar,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    minHeight: layout.navBar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.step6,
  },
  headerRight: {
    minHeight: layout.navBar,
    justifyContent: 'center',
  },
  headerText: {
    ...typography.body,
    ...OVERLAY_TEXT_SHADOW,
    color: OVERLAY_TEXT,
  },
});
