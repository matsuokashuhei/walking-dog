import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { components, elevation, radius, spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface DogProgressSummary {
  todayKm: number;
  totalWalks: number;
  streakDays: number;
}

interface DogListItemProps {
  dog: Dog;
  onPress: (id: string) => void;
  progress?: DogProgressSummary;
}

export function DogListItem({ dog, onPress, progress }: DogListItemProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const showStreak = progress !== undefined && progress.streakDays > 0;
  const metaLine = progress
    ? t('dogs.list.todayStats', {
        km: progress.todayKm.toFixed(2),
        count: progress.totalWalks,
      })
    : dog.breed;

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
          {showStreak ? (
            <View
              style={[styles.streakBadge, { backgroundColor: theme.surfaceContainer }]}
            >
              <Text style={[styles.streakText, { color: theme.warning }]}>
                {t('dogs.list.streak', { days: progress!.streakDays })}
              </Text>
            </View>
          ) : null}
        </View>
        {metaLine ? (
          <Text style={[styles.breed, { color: theme.onSurfaceVariant }]}>
            {metaLine}
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
    padding: spacing.step14,
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
  },
  streakBadge: {
    paddingHorizontal: spacing.step6,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.sm,
  },
  streakText: {
    ...typography.metricLabel,
    fontWeight: components.button.fontPrimary.fontWeight,
  },
  breed: {
    ...typography.footnote,
    marginTop: spacing.xs / 2,
  },
  chevron: {
    ...typography.title2,
    marginLeft: spacing.sm,
  },
});
