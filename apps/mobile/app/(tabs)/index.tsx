import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { useMyWalks } from '@/hooks/use-walks';
import { WalkHistoryItem } from '@/components/walk/WalkHistoryItem';
import type { Walk } from '@/types/graphql';

export default function HomeScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: walks, isLoading } = useMyWalks();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('walk.history.title')}</Text>
      {!isLoading && (!walks || walks.length === 0) ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('walk.history.empty')}
        </Text>
      ) : (
        <FlatList
          data={walks}
          keyExtractor={(item: Walk) => item.id}
          renderItem={({ item }) => <WalkHistoryItem walk={item} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.md },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  list: { paddingBottom: spacing.xl },
});
