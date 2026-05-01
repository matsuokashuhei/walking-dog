import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useFriendship } from '@/hooks/use-friendship';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { OutlinedCard } from '@/components/ui/OutlinedCard';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/hooks/use-colors';
import { formatDuration, formatShortDate } from '@/lib/walk/format';
import { spacing, radius, typography } from '@/theme/tokens';

// 友達犬詳細画面は自分の犬 ID と相手の犬 ID から関係サマリーを表示します。
export default function FriendDogDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id, friendDogId } = useLocalSearchParams<{ id: string; friendDogId: string }>();
  const router = useRouter();
  const theme = useColors();

  const { data: friendship, isLoading } = useFriendship(id, friendDogId);

  if (isLoading) return <LoadingScreen />;
  if (!friendship) return <LoadingScreen />;

  const { friend } = friendship;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.photoSection}>
        <Image
          source={friend.photoUrl ?? require('@/assets/images/icon.png')}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      <View style={styles.heroSection}>
        <Text style={[styles.dogName, { color: theme.onSurface }]}>{friend.name}</Text>
        {friend.breed ? (
          <Text style={[styles.breed, { color: theme.onSurfaceVariant }]}>{friend.breed}</Text>
        ) : null}
      </View>

      <View style={styles.statsGrid}>
        {/* 関係の強さが分かるよう、遭遇回数と合計時間を先に並べます。 */}
        <OutlinedCard padding="md">
          <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
            {t('dogs.friends.encounters', 'Encounters').toUpperCase()}
          </Text>
          <Text style={[styles.statValue, { color: theme.onSurface }]}>
            {friendship.encounterCount}
          </Text>
        </OutlinedCard>
        <OutlinedCard padding="md">
          <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
            {t('dogs.friends.totalTime', 'Total Time').toUpperCase()}
          </Text>
          <Text style={[styles.statValue, { color: theme.onSurface }]}>
            {formatDuration(friendship.totalInteractionSec, i18n.language)}
          </Text>
        </OutlinedCard>
      </View>

      <View style={styles.statsGrid}>
        {/* 初回と直近の遭遇日を並べ、関係がいつ始まり更新されたかを見せます。 */}
        <OutlinedCard padding="md">
          <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
            {t('dogs.friends.firstMet', 'First Met').toUpperCase()}
          </Text>
          <Text style={[styles.statValue, { color: theme.onSurface }]}>
            {formatShortDate(friendship.firstMetAt, i18n.language)}
          </Text>
        </OutlinedCard>
        <OutlinedCard padding="md">
          <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
            {t('dogs.friends.lastMet', 'Last Met').toUpperCase()}
          </Text>
          <Text style={[styles.statValue, { color: theme.onSurface }]}>
            {formatShortDate(friendship.lastMetAt, i18n.language)}
          </Text>
        </OutlinedCard>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('dogs.friends.viewEncounterHistory', 'View Encounter History')}
          variant="secondary"
          onPress={() => router.push(`/dogs/${id}/encounters`)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  photoSection: { alignItems: 'center', paddingVertical: spacing.xl },
  photo: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
  },
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  dogName: {
    ...typography.title1,
    textAlign: 'center',
  },
  breed: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  statLabel: {
    ...typography.metricLabel,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.title1,
  },
  actions: {
    padding: spacing.lg,
  },
});
