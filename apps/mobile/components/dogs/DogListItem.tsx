import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { elevation, radius, spacing, typography } from '@/theme/tokens';
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
        { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 },
        elevation.low,
      ]}
    >
      <Image
        source={dog.photoUrl ?? require('@/assets/images/icon.png')}
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
          <Text style={[styles.breed, { color: theme.onSurfaceVariant }]}>
            {dog.breed}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.chevron, { color: theme.textDisabled }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
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
    ...typography.headline,
    fontWeight: '600' as const,
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
    ...typography.footnote,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    marginLeft: spacing.sm,
  },
});
