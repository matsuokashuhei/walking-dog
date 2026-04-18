import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';
import type { Dog, WalkEvent } from '@/types/graphql';

interface PerDogSummaryCardProps {
  dogs: Dog[];
  events: WalkEvent[];
  onViewEach?: () => void;
}

const AVATAR = 36;

export function PerDogSummaryCard({
  dogs,
  events,
  onViewEach,
}: PerDogSummaryCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.onSurface }]}>
          {t('walk.finished.perDog')}
        </Text>
        {onViewEach ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('walk.finished.viewEach')}
            onPress={onViewEach}
            hitSlop={8}
          >
            <Text style={[styles.link, { color: theme.interactive }]}>
              {t('walk.finished.viewEach')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <GroupedCard>
        {dogs.map((dog, i) => {
          const counts = countFor(dog.id, events);
          return (
            <View key={dog.id}>
              {i > 0 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
              <View style={styles.row}>
                <Image
                  source={dog.photoUrl ?? require('@/assets/images/icon.png')}
                  style={styles.avatar}
                  contentFit="cover"
                  accessibilityLabel={dog.name}
                />
                <View style={styles.body}>
                  <Text
                    style={[styles.name, { color: theme.onSurface }]}
                    numberOfLines={1}
                  >
                    {dog.name}
                  </Text>
                  <Text
                    style={[styles.counts, { color: theme.onSurfaceVariant }]}
                    accessibilityLabel={`${dog.name} pee ${counts.pee}, poo ${counts.poo}, photo ${counts.photo}`}
                  >
                    {`💧 ${counts.pee}  ·  💩 ${counts.poo}  ·  📷 ${counts.photo}`}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.textDisabled }]}>
                  ›
                </Text>
              </View>
            </View>
          );
        })}
      </GroupedCard>
    </View>
  );
}

interface Counts {
  pee: number;
  poo: number;
  photo: number;
}

function countFor(dogId: string, events: WalkEvent[]): Counts {
  const counts: Counts = { pee: 0, poo: 0, photo: 0 };
  for (const e of events) {
    if (e.dogId !== dogId) continue;
    if (e.eventType === 'pee') counts.pee += 1;
    else if (e.eventType === 'poo') counts.poo += 1;
    else if (e.eventType === 'photo') counts.photo += 1;
  }
  return counts;
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline,
  },
  link: {
    ...typography.subheadline,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md + AVATAR + spacing.sm + 4,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.full,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
  },
  counts: {
    ...typography.footnote,
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    fontSize: 22,
    fontWeight: '400',
    marginLeft: spacing.xs,
  },
});
