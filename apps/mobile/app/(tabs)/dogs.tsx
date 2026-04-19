import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/hooks/use-me';
import { usePackProgress } from '@/hooks/use-pack-progress';
import { DogListItem } from '@/components/dogs/DogListItem';
import { PackRollupCard } from '@/components/dogs/PackRollupCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

export default function DogsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { data: me, isLoading, refetch } = useMe();
  const pack = usePackProgress();

  if (isLoading) return <LoadingScreen />;

  const dogs = me?.dogs ?? [];

  const ListHeader = (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
          {t('dogs.list.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dogs.list.addDog')}
          onPress={() => router.push('/dogs/new')}
          hitSlop={12}
        >
          <Text style={[styles.addCta, { color: theme.interactive }]}>
            {t('dogs.list.addCta')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.rollupWrap}>
        <PackRollupCard
          todayKm={pack.todayKm}
          goalKm={pack.goalKm}
          progressPct={pack.progressPct}
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
        data={dogs}
        keyExtractor={(dog) => dog.id}
        renderItem={({ item }) => (
          <DogListItem
            dog={item}
            onPress={(id) => router.push(`/dogs/${id}`)}
            progress={pack.perDog[item.id]}
          />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <EmptyState
            message={t('dogs.list.empty')}
            ctaLabel={t('dogs.list.addDog')}
            onCta={() => router.push('/dogs/new')}
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
