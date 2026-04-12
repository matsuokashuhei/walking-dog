import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography, radius } from '@/theme/tokens';
import { useMyWalks } from '@/hooks/use-walks';
import { WalkHistoryItem } from '@/components/walk/WalkHistoryItem';
import type { Walk } from '@/types/graphql';

interface WalkReadyViewProps {
  onStartPress: () => void;
}

export function WalkReadyView({ onStartPress }: WalkReadyViewProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const { data: walks, isLoading } = useMyWalks();

  const ListHeader = (
    <View style={styles.hero}>
      <Text style={[styles.heroText, { color: theme.onSurface }]}>
        {t('walk.home.hero')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.home.startWalk')}
        onPress={onStartPress}
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

  if (!isLoading && (!walks || walks.length === 0)) {
    return (
      <View style={styles.container}>
        {ListHeader}
        <Text style={[styles.empty, { color: theme.onSurfaceVariant }]}>
          {t('walk.history.empty')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={walks}
      keyExtractor={(item: Walk) => item.id}
      renderItem={({ item }) => <WalkHistoryItem walk={item} />}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.list}
    />
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
  empty: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  list: { paddingBottom: spacing.xl },
});
