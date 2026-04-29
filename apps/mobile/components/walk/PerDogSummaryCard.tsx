import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { useColors } from '@/hooks/use-colors';
import { UI_EVENT_EMOJIS, countEventsByType } from '@/lib/walk/events';
import { radius, spacing, typography } from '@/theme/tokens';
import type { Dog, WalkEvent } from '@/types/graphql';

interface PerDogSummaryCardProps {
  dogs: Dog[];
  events: WalkEvent[];
  onViewEach?: () => void;
}

const AVATAR = 36;

// 散歩終了後に、犬ごとのイベント集計を一覧で確認できるカードです。
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
          // 表示直前に犬 ID でイベントを絞り込み、犬別の回数だけを集計します。
          const counts = countEventsByType(events, { dogId: dog.id });
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
                    {`${UI_EVENT_EMOJIS.pee} ${counts.pee}  ·  ${UI_EVENT_EMOJIS.poo} ${counts.poo}  ·  ${UI_EVENT_EMOJIS.photo} ${counts.photo}`}
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
