import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
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
      <View style={styles.ctaColumn}>
        <Button
          label="START"
          variant="success"
          size="circle"
          onPress={onStartPress}
        />
        <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
          {t('walk.home.hero')}
        </Text>
      </View>
      <SectionHeader
        label={t('walk.history.title')}
        style={styles.sectionHeader}
      />
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
    paddingTop: spacing.xxl,
  },
  ctaColumn: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hint: {
    ...typography.footnote,
    textAlign: 'center',
    marginTop: spacing.lg,
    maxWidth: 260,
  },
  sectionHeader: {
    marginTop: spacing.md,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  list: { paddingBottom: spacing.xl },
});
