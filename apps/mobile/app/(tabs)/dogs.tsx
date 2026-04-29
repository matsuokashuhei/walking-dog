import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDogsScreenViewModel } from '@/hooks/use-dogs-screen-view-model';
import { DogListItem } from '@/components/dogs/DogListItem';
import { PackRollupCard } from '@/components/dogs/PackRollupCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

// 犬一覧タブは pack 全体の進捗と登録済み犬の一覧操作を view-model へ委譲します。
export default function DogsScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const vm = useDogsScreenViewModel();

  if (vm.isLoading) return <LoadingScreen />;

  // 一覧の先頭には画面タイトル、追加導線、pack の集計カードをまとめて表示します。
  const ListHeader = (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
          {t('dogs.list.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dogs.list.addDog')}
          onPress={vm.handleAddDog}
          hitSlop={12}
        >
          <Text style={[styles.addCta, { color: theme.interactive }]}>
            {t('dogs.list.addCta')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.rollupWrap}>
        <PackRollupCard
          todayKm={vm.pack.todayKm}
          goalKm={vm.pack.goalKm}
          progressPct={vm.pack.progressPct}
        />
      </View>

      <SectionHeader
        label={t('dogs.list.sectionLabel')}
        style={styles.sectionHeader}
      />
    </View>
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <FlatList
        data={vm.dogs}
        keyExtractor={(dog) => dog.id}
        renderItem={({ item }) => (
          <DogListItem
            dog={item}
            onPress={vm.handleOpenDog}
            progress={vm.pack.perDog[item.id]}
          />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        onRefresh={vm.handleRefresh}
        refreshing={vm.isLoading}
        ListEmptyComponent={
          // 登録済みの犬がいない場合だけ、犬追加への導線を空状態として表示します。
          <EmptyState
            message={t('dogs.list.empty')}
            ctaLabel={t('dogs.list.addDog')}
            onCta={vm.handleAddDog}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.largeTitle,
  },
  addCta: {
    fontSize: 17,
    fontWeight: '400',
  },
  rollupWrap: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: 0,
  },
  list: {
    paddingHorizontal: spacing.md,
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
});
