import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { DogWalkRow } from './DogWalkRow';
import type { Walk } from '@/types/graphql';

interface DogWalksListProps {
  walks: Walk[];
  onPressWalk?: (id: string) => void;
  onSeeAll?: () => void;
  maxRows?: number;
}

export function DogWalksList({
  walks,
  onPressWalk,
  onSeeAll,
  maxRows = 5,
}: DogWalksListProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const visible = walks.slice(0, maxRows);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.onSurface }]}>
          {t('dogs.detail.walks')}
        </Text>
        {onSeeAll && walks.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dogs.detail.seeAll')}
            onPress={onSeeAll}
            hitSlop={8}
          >
            <Text style={[styles.seeAll, { color: theme.interactive }]}>
              {t('dogs.detail.seeAll')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {visible.length === 0 ? (
        <GroupedCard elevated>
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
              {t('walk.history.empty')}
            </Text>
          </View>
        </GroupedCard>
      ) : (
        <GroupedCard elevated>
          {visible.map((walk, idx) => (
            <DogWalkRow
              key={walk.id}
              walk={walk}
              onPress={onPressWalk}
              separator={idx < visible.length - 1}
            />
          ))}
        </GroupedCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.title2,
    fontSize: 20,
  },
  seeAll: {
    ...typography.subheadline,
    fontSize: 15,
  },
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.footnote,
  },
});
