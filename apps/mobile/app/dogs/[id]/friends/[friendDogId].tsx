import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useFriendship } from '@/hooks/use-friendship';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { OutlinedCard } from '@/components/ui/OutlinedCard';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export default function FriendDogDetailScreen() {
  const { t } = useTranslation();
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
            {formatDuration(friendship.totalInteractionSec)}
          </Text>
        </OutlinedCard>
      </View>

      <View style={styles.statsGrid}>
        <OutlinedCard padding="md">
          <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
            {t('dogs.friends.firstMet', 'First Met').toUpperCase()}
          </Text>
          <Text style={[styles.statValue, { color: theme.onSurface }]}>
            {new Date(friendship.firstMetAt).toLocaleDateString()}
          </Text>
        </OutlinedCard>
        <OutlinedCard padding="md">
          <Text style={[styles.statLabel, { color: theme.onSurfaceVariant }]}>
            {t('dogs.friends.lastMet', 'Last Met').toUpperCase()}
          </Text>
          <Text style={[styles.statValue, { color: theme.onSurface }]}>
            {new Date(friendship.lastMetAt).toLocaleDateString()}
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
    ...typography.hero,
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
    ...typography.label,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.56,
  },
  actions: {
    padding: spacing.lg,
  },
});
