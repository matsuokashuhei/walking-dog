import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { getPhotoUrl } from '@/lib/photo-url';
import type { Dog } from '@/types/graphql';

interface DogListItemProps {
  dog: Dog;
  onPress: (id: string) => void;
}

export function DogListItem({ dog, onPress }: DogListItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dog.name}
      onPress={() => onPress(dog.id)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Image
        source={getPhotoUrl(dog.photoUrl) ?? require('@/assets/images/icon.png')}
        style={styles.photo}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{dog.name}</Text>
        {dog.breed ? (
          <Text style={[styles.breed, { color: colors.textSecondary }]}>{dog.breed}</Text>
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
    borderRadius: radius.md,
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
  name: {
    ...typography.bodyMedium,
  },
  breed: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
