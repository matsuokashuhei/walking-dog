import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDogFriends } from '@/hooks/use-dog-friends';
import { FriendCard } from '@/components/dogs/FriendCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';
import type { Friendship } from '@/types/graphql';

// 友達一覧画面は遭遇から生まれた犬同士の関係を一覧化し、個別詳細へつなげます。
export default function DogFriendsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColors();

  const { data: friends, isLoading } = useDogFriends(id);

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('dogs.friends.title')}
        leftAction="back"
      />
      {!friends || friends.length === 0 ? (
        // 友達がまだいない場合は、散歩開始を促す空状態だけを表示します。
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
