import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDogEncounters } from '@/hooks/use-dog-encounters';
import { EncounterCard } from '@/components/dogs/EncounterCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import type { Encounter } from '@/types/graphql';

export default function DogEncountersScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useColors();

  const { data: encounters, isLoading } = useDogEncounters(id);

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>
          {t('dogs.encounters.sectionLabel', 'HISTORY').toUpperCase()}
        </Text>
        <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
          {t('dogs.encounters.title', 'Encounters')}
        </Text>
      </View>

      {!encounters || encounters.length === 0 ? (
        <EmptyState
          message={t('dogs.encounters.empty', 'No encounters yet. Start a walk to meet other dogs!')}
        />
      ) : (
        <FlatList<Encounter>
          data={encounters}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EncounterCard encounter={item} myDogId={id} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.hero,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
