import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { Button } from '@/components/ui/Button';
import { DogWalkRow } from './DogWalkRow';
import type { Walk } from '@/types/graphql';

interface DogWalksListProps {
  walks: Walk[];
  onPressWalk?: (id: string) => void;
  onSeeAll?: () => void;
  maxRows?: number;
  // 散歩履歴の取得に失敗したとき、空表示の代わりにエラーと再試行導線を出します。
  error?: Error | null;
  onRetry?: () => void;
}

export function DogWalksList({
  walks,
  onPressWalk,
  onSeeAll,
  maxRows = 5,
  error,
  onRetry,
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
        {onSeeAll && !error && walks.length > 0 ? (
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

      {error ? (
        <GroupedCard elevated>
          <View style={styles.errorBody}>
            <Text style={[styles.errorText, { color: theme.error }]}>
              {t('dogs.detail.walksError')}
            </Text>
            {__DEV__ ? (
              <Text style={[styles.errorDetail, { color: theme.onSurfaceVariant }]}>
                {error.message}
              </Text>
            ) : null}
            {onRetry ? (
              <Button
                label={t('common.retry')}
                variant="secondary"
                onPress={onRetry}
                style={styles.retryButton}
              />
            ) : null}
          </View>
        </GroupedCard>
      ) : visible.length === 0 ? (
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.title2,
  },
  seeAll: {
    ...typography.subheadline,
  },
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.footnote,
  },
  errorBody: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  errorDetail: {
    ...typography.footnote,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
