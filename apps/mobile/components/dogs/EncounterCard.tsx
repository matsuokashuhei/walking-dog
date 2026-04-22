import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { OutlinedCard } from '@/components/ui/OutlinedCard';
import { formatDateTime, formatDuration } from '@/lib/walk/format';
import type { Encounter } from '@/types/graphql';

interface EncounterCardProps {
  encounter: Encounter;
  myDogId: string;
}

export function EncounterCard({ encounter, myDogId }: EncounterCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useColors();

  // Show the other dog (not mine)
  const otherDog = encounter.dog1.id === myDogId ? encounter.dog2 : encounter.dog1;

  return (
    <OutlinedCard style={styles.card}>
      <Image
        source={otherDog.photoUrl ?? require('@/assets/images/icon.png')}
        style={styles.avatar}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.onSurface }]}>{otherDog.name}</Text>
        <Text style={[styles.meta, { color: theme.onSurfaceVariant }]}>
          {formatDateTime(encounter.metAt, i18n.language)}
        </Text>
      </View>
      <View style={styles.duration}>
        <Text style={[styles.durationValue, { color: theme.onSurface }]}>
          {formatDuration(encounter.durationSec, i18n.language)}
        </Text>
        <Text style={[styles.durationLabel, { color: theme.onSurfaceVariant }]}>
          {t('dogs.encounters.duration', 'duration')}
        </Text>
      </View>
    </OutlinedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
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
  duration: {
    alignItems: 'flex-end',
  },
  durationValue: {
    ...typography.bodyMedium,
  },
  durationLabel: {
    ...typography.caption,
  },
});
