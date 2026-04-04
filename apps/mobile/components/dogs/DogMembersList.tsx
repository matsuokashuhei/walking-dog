import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { DogMember } from '@/types/graphql';

interface DogMembersListProps {
  members: DogMember[];
  currentUserId: string;
  isOwner: boolean;
  onRemove: (userId: string, displayName: string) => void;
}

export function DogMembersList({ members, currentUserId, isOwner, onRemove }: DogMembersListProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            {item.user.avatarUrl ? (
              <Image
                source={{ uri: item.user.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={item.user.displayName ?? ''}
              />
            ) : (
              <View style={[styles.avatar, styles.initialBg, { backgroundColor: colors.primary }]}>
                <Text style={styles.initialText}>{initial}</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>
                {item.user.displayName}
              </Text>
              <Text style={[styles.role, { color: colors.textSecondary }]}>
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
                <Text style={[styles.removeText, { color: colors.error }]}>
                  {t('dogs.members.remove')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 40, height: 40, borderRadius: radius.full },
  initialBg: { alignItems: 'center', justifyContent: 'center' },
  initialText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' as const },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.bodyMedium },
  role: { ...typography.caption, marginTop: 2 },
  removeText: { ...typography.body, fontWeight: '500' as const },
});
