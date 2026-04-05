import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { getPhotoUrl } from '@/lib/photo-url';
import type { Dog } from '@/types/graphql';

interface DogListItemProps {
  dog: Dog;
  onPress: (id: string) => void;
}

export function DogListItem({ dog, onPress }: DogListItemProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const isShared = dog.role === 'member';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dog.name}
      onPress={() => onPress(dog.id)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.border + '33',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Image
        source={getPhotoUrl(dog.photoUrl) ?? require('@/assets/images/icon.png')}
        style={styles.photo}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.onSurface }]}>{dog.name}</Text>
          {isShared ? (
            <View style={[styles.badge, { backgroundColor: theme.surfaceContainer }]}>
              <Text style={[styles.badgeText, { color: theme.onSurfaceVariant }]}>
                {t('shared.badge')}
              </Text>
            </View>
          ) : null}
        </View>
        {dog.breed ? (
          <Text style={[styles.breed, { color: theme.onSurfaceVariant }]}>{dog.breed}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
  },
  info: {
    marginLeft: spacing.md,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.h3,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  breed: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
