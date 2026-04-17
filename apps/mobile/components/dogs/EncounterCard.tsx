import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { OutlinedCard } from '@/components/ui/OutlinedCard';
import type { Encounter } from '@/types/graphql';

interface EncounterCardProps {
  encounter: Encounter;
  myDogId: string;
}

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export function EncounterCard({ encounter, myDogId }: EncounterCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  // Show the other dog (not mine)
  const otherDog = encounter.dog1.id === myDogId ? encounter.dog2 : encounter.dog1;
  const metDate = new Date(encounter.metAt);

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
          {metDate.toLocaleString()}
        </Text>
      </View>
      <View style={styles.duration}>
        <Text style={[styles.durationValue, { color: theme.onSurface }]}>
          {formatDuration(encounter.durationSec)}
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
