import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography, radius } from '@/theme/tokens';
import { useMyWalks } from '@/hooks/use-walks';
import { WalkHistoryItem } from '@/components/walk/WalkHistoryItem';
import type { Walk } from '@/types/graphql';

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const router = useRouter();
  const { data: walks, isLoading } = useMyWalks();

  const ListHeader = (
    <View style={styles.hero}>
      <Text style={[styles.heroText, { color: theme.onSurface }]}>
        {t('walk.home.hero')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.home.startWalk')}
        onPress={() => router.push('/(tabs)/walk')}
        style={[styles.heroCta, { backgroundColor: theme.interactive }]}
      >
        <Text style={[styles.heroCtaText, { color: theme.onInteractive }]}>
          {t('walk.home.startWalk')}
        </Text>
      </Pressable>
      <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>
        {t('walk.history.title')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      {!isLoading && (!walks || walks.length === 0) ? (
        <>
          {ListHeader}
          <Text style={[styles.empty, { color: theme.onSurfaceVariant }]}>
            {t('walk.history.empty')}
          </Text>
        </>
      ) : (
        <FlatList
          data={walks}
          keyExtractor={(item: Walk) => item.id}
          renderItem={({ item }) => <WalkHistoryItem walk={item} />}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroText: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  heroCta: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  heroCtaText: {
    ...typography.button,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  list: { paddingBottom: spacing.xl },
});
