import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { Tag } from '@/components/ui/Tag';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface GroupWalkSummaryCardProps {
  dogs: Dog[];
}

const AVATAR_SIZE = 36;
const AVATAR_OVERLAP = -10;
const MAX_AVATARS = 3;

export function GroupWalkSummaryCard({ dogs }: GroupWalkSummaryCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  if (dogs.length < 2) return null;

  const visibleAvatars = dogs.slice(0, MAX_AVATARS);
  const count = dogs.length;

  return (
    <GroupedCard style={styles.card}>
      <View style={styles.stack}>
        {visibleAvatars.map((dog, index) => (
          <Image
            key={dog.id}
            testID="group-walk-avatar"
            source={dog.photoUrl ?? require('@/assets/images/icon.png')}
            style={[
              styles.avatar,
              {
                marginLeft: index === 0 ? 0 : AVATAR_OVERLAP,
                borderColor: theme.surface,
                zIndex: MAX_AVATARS - index,
              },
            ]}
            contentFit="cover"
          />
        ))}
      </View>
      <Text style={[styles.caption, { color: theme.onSurface }]}>
        <Text style={styles.captionBold}>
          {t('walk.ready.dogsWalkingBold', { count })}
        </Text>{' '}
        {t('walk.ready.dogsWalkingTail')}
      </Text>
      <Tag tone="success" label={t('walk.ready.groupWalk')} />
    </GroupedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  stack: {
    flexDirection: 'row',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    borderWidth: 2.5,
  },
  caption: {
    ...typography.subheadline,
    flex: 1,
  },
  captionBold: {
    fontWeight: '700',
  },
});
