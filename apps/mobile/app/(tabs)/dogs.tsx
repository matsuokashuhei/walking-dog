import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/hooks/use-me';
import { DogListItem } from '@/components/dogs/DogListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography, radius } from '@/theme/tokens';

export default function DogsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { data: me, isLoading, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;

  const dogCount = me?.dogs?.length ?? 0;

  const ListHeader = (
    <View style={styles.headerContainer}>
      <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>
        {t('dogs.list.sectionLabel')}
      </Text>
      <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
        {t('dogs.list.title')}
      </Text>

      <View style={styles.bentoRow}>
        <View
          style={[
            styles.bentoCard,
            {
              backgroundColor: theme.surfaceContainerLowest,
              borderColor: theme.border + '33',
            },
          ]}
        >
          <Text style={[styles.bentoValue, { color: theme.onSurface }]}>
            {dogCount}
          </Text>
          <Text style={[styles.bentoLabel, { color: theme.onSurfaceVariant }]}>
            Dogs
          </Text>
        </View>
      </View>
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
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bentoCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  bentoValue: {
    ...typography.display,
    marginBottom: spacing.xs,
  },
  bentoLabel: {
    ...typography.label,
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
