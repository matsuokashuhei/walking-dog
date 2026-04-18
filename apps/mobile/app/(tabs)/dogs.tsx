import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/hooks/use-me';
import { DogListItem } from '@/components/dogs/DogListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

export default function DogsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { data: me, isLoading, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;

  const dogCount = me?.dogs?.length ?? 0;

  const ListHeader = (
    <View style={styles.headerContainer}>
      <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
        {t('dogs.list.title')}
      </Text>

      {/* Today's roll-up — placeholder until goal-tracking lands. The dog
          count is shown as the immediate indicator; "›" hints at a future
          drill-down to a per-pack goal screen. */}
      <GroupedCard style={styles.rollup}>
        <View style={styles.rollupRow}>
          <View
            style={[
              styles.rollupAvatar,
              { backgroundColor: theme.surfaceContainer },
            ]}
          >
            <Text style={[styles.rollupAvatarText, { color: theme.success }]}>
              {dogCount}
            </Text>
          </View>
          <View style={styles.rollupInfo}>
            <Text style={[styles.rollupTitle, { color: theme.onSurface }]}>
              Today&apos;s walking goal
            </Text>
            <Text
              style={[styles.rollupSubtitle, { color: theme.onSurfaceVariant }]}
            >
              {dogCount} across your pack
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.textDisabled }]}>›</Text>
        </View>
      </GroupedCard>

      <SectionHeader
        label={t('dogs.list.sectionLabel')}
        style={styles.sectionHeader}
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={me?.dogs ?? []}
        keyExtractor={(dog) => dog.id}
        renderItem={({ item }) => (
          <DogListItem
            dog={item}
            onPress={(id) => router.push(`/dogs/${id}`)}
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dogs.list.addDog')}
        style={[styles.fab, { backgroundColor: theme.interactive }]}
        onPress={() => router.push('/dogs/new')}
      >
        <Text style={[styles.fabIcon, { color: theme.onInteractive }]}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 41,
    marginBottom: spacing.lg,
  },
  rollup: {
    marginBottom: spacing.xl,
  },
  rollupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  rollupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollupAvatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  rollupInfo: { flex: 1 },
  rollupTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rollupSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 0,
  },
  chevron: {
    fontSize: 22,
    marginLeft: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    flexGrow: 1,
    paddingBottom: spacing.xl + 56 + spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 28,
    lineHeight: 32,
  },
});
