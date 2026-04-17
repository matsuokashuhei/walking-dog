import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDogFriends } from '@/hooks/use-dog-friends';
import { FriendCard } from '@/components/dogs/FriendCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import type { Friendship } from '@/types/graphql';

export default function DogFriendsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColors();

  const { data: friends, isLoading } = useDogFriends(id);

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>
          {t('dogs.friends.sectionLabel', 'FRIENDS').toUpperCase()}
        </Text>
        <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
          {t('dogs.friends.title', 'Friends')}
        </Text>
      </View>

      {!friends || friends.length === 0 ? (
        <EmptyState
          message={t('dogs.friends.empty', 'No friends yet. Start a walk to meet other dogs!')}
        />
      ) : (
        <FlatList<Friendship>
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendCard
              friendship={item}
              onPress={() => router.push(`/dogs/${id}/friends/${item.friend.id}`)}
            />
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
