import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDogEncounters } from '@/hooks/use-dog-encounters';
import { EncounterCard } from '@/components/dogs/EncounterCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';
import type { Encounter } from '@/types/graphql';

// 遭遇履歴画面は指定された犬 ID の encounter 一覧を取得して時系列カードで表示します。
export default function DogEncountersScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useColors();

  const { data: encounters, isLoading } = useDogEncounters(id);

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('dogs.encounters.title')}
        leftAction="back"
      />
      {!encounters || encounters.length === 0 ? (
        // まだ散歩中の遭遇がない場合は、履歴リストの代わりに空状態を表示します。
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
