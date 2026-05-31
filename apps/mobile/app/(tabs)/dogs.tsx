import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDogsScreenViewModel } from '@/hooks/use-dogs-screen-view-model';
import { DogListItem } from '@/components/dogs/DogListItem';
import { PackRollupCard } from '@/components/dogs/PackRollupCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

// 犬一覧タブは pack 全体の進捗と登録済み犬の一覧操作を view-model へ委譲します。
export default function DogsScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const vm = useDogsScreenViewModel();

  if (vm.isLoading) return <LoadingScreen />;

  // 一覧の先頭には pack の集計カードとセクション見出しをまとめて表示します。
  const ListHeader = (
    <View style={styles.headerContainer}>
      <View style={styles.rollupWrap}>
        <PackRollupCard
          progressMinutes={vm.pack.goalProgressMinutes}
          goalMinutes={vm.pack.goalMinutes}
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
      <ScreenHeader
        title={t('dogs.list.title')}
        testID="dogs-header"
        rightAction={{ label: t('dogs.list.addCta'), onPress: vm.handleAddDog }}
      />
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
  rollupWrap: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xs - spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
});
