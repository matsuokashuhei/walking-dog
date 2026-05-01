import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { formatShortDate } from '@/lib/walk/format';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Friendship } from '@/types/graphql';

interface FriendCardProps {
  friendship: Friendship;
  onPress: () => void;
}

export function FriendCard({ friendship, onPress }: FriendCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useColors();
  const { friend } = friendship;

  const lastMetDate = formatShortDate(friendship.lastMetAt, i18n.language);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${friend.name}, ${t('dogs.friends.encounterCount', { count: friendship.encounterCount })}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
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
        <Text style={[styles.chevron, { color: theme.onSurfaceVariant }]}>{'>'}</Text>
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
    ...typography.body,
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  date: {
    ...typography.caption,
  },
  chevron: {
    ...typography.title2,
  },
});
