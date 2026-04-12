import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Friendship } from '@/types/graphql';

interface FriendCardProps {
  friendship: Friendship;
  onPress: () => void;
}

export function FriendCard({ friendship, onPress }: FriendCardProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const { friend } = friendship;

  const lastMetDate = new Date(friendship.lastMetAt).toLocaleDateString();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${friend.name}, ${t('dogs.friends.encounterCount', { count: friendship.encounterCount })}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.border + '33',
        },
      ]}
      onPress={onPress}
    >
      <Image
        source={friend.photoUrl ?? require('@/assets/images/icon.png')}
        style={styles.avatar}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.onSurface }]}>{friend.name}</Text>
        <Text style={[styles.meta, { color: theme.onSurfaceVariant }]}>
          {t('dogs.friends.encounterCount', {
            count: friendship.encounterCount,
            defaultValue: '{{count}} encounters',
          })}
        </Text>
      </View>
      <View style={styles.trailing}>
        <Text style={[styles.date, { color: theme.onSurfaceVariant }]}>
          {lastMetDate}
        </Text>
        <Text style={{ color: theme.onSurfaceVariant, fontSize: 20 }}>{'>'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    ...typography.bodyMedium,
  },
  meta: {
    ...typography.caption,
    marginTop: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 4,
  },
  date: {
    ...typography.caption,
  },
});
