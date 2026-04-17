import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { OutlinedCard } from '@/components/ui/OutlinedCard';
import type { DogMember } from '@/types/graphql';

interface DogMembersListProps {
  members: DogMember[];
  currentUserId: string;
  isOwner: boolean;
  onRemove: (userId: string, displayName: string) => void;
}

export function DogMembersList({ members, currentUserId, isOwner, onRemove }: DogMembersListProps) {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => {
        const initial = item.user.displayName?.charAt(0)?.toUpperCase() ?? '?';
        const roleLabel = t(`dogs.members.role.${item.role}`);
        const canRemove = isOwner && item.userId !== currentUserId;

        return (
          <OutlinedCard style={styles.row}>
            {item.user.avatarUrl ? (
              <Image
                source={{ uri: item.user.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={item.user.displayName ?? ''}
              />
            ) : (
              <View
                style={[styles.avatar, styles.initialBg, { backgroundColor: theme.primaryContainer }]}
              >
                <Text style={[styles.initialText, { color: theme.onInteractive }]}>{initial}</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={[styles.name, { color: theme.onSurface }]}>
                {item.user.displayName}
              </Text>
              <Text style={[styles.role, { color: theme.onSurfaceVariant }]}>
                {roleLabel}
              </Text>
            </View>
            {canRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('dogs.members.remove')}
                hitSlop={12}
                onPress={() => onRemove(item.userId, item.user.displayName ?? '')}
              >
                <Text style={[styles.removeText, { color: theme.error }]}>
                  {t('dogs.members.remove')}
                </Text>
              </Pressable>
            ) : null}
          </OutlinedCard>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: { height: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: radius.full },
  initialBg: { alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 16, fontWeight: '600' as const },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.bodyMedium },
  role: { ...typography.label, marginTop: 2 },
  removeText: { ...typography.body, fontWeight: '500' as const },
});
