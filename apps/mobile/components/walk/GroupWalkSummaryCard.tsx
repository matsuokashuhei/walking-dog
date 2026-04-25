import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { Tag } from '@/components/ui/Tag';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface GroupWalkSummaryCardProps {
  dogs: Dog[];
}

const MAX_VISIBLE_AVATARS = 3;

export function GroupWalkSummaryCard({ dogs }: GroupWalkSummaryCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  if (dogs.length < 2) return null;

  const visibleDogs = dogs.slice(0, MAX_VISIBLE_AVATARS);
  const remainingCount = dogs.length - visibleDogs.length;

  return (
    <GroupedCard padding="md">
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.avatarStack}>
            {visibleDogs.map((dog, index) => (
              <Image
                key={dog.id}
                testID={`group-walk-avatar-${dog.id}`}
                source={dog.photoUrl ?? require('@/assets/images/icon.png')}
                style={[
                  styles.avatar,
                  index > 0 ? styles.avatarOverlap : null,
                  {
                    zIndex: visibleDogs.length - index,
                    borderColor: theme.surface,
                  },
                ]}
                contentFit="cover"
              />
            ))}
            {remainingCount > 0 ? (
              <View
                style={[
                  styles.countBadge,
                  {
                    borderColor: theme.surface,
                    backgroundColor: theme.surfaceContainer,
                  },
                ]}
              >
                <Text style={[styles.countLabel, { color: theme.onSurface }]}>+{remainingCount}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.summary, { color: theme.onSurface }]}>
            <Text style={styles.summaryStrong}>
              {t('walk.ready.dogsWalkingBold', { count: dogs.length })}
            </Text>
            <Text>{t('walk.ready.dogsWalkingTail')}</Text>
          </Text>
        </View>

        <Tag tone="success" label={t('walk.ready.groupWalk')} />
      </View>
    </GroupedCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 2,
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.full,
    marginLeft: -10,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  countLabel: {
    ...typography.caption,
    fontWeight: '700',
  },
  summary: {
    ...typography.subheadline,
    flexShrink: 1,
  },
  summaryStrong: {
    fontWeight: '700',
  },
});
