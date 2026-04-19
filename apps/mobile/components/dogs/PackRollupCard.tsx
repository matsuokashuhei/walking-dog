import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { RingProgress } from '@/components/ui/RingProgress';

interface PackRollupCardProps {
  todayKm: number;
  goalKm: number;
  progressPct: number;
  onPress?: () => void;
}

export function PackRollupCard({
  todayKm,
  goalKm,
  progressPct,
  onPress,
}: PackRollupCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  const subtitle = t('dogs.list.acrossPack', {
    km: todayKm.toFixed(2),
    goal: goalKm.toFixed(1),
  });

  const content = (
    <>
      <RingProgress
        size={44}
        strokeWidth={4}
        progress={progressPct}
        color={theme.success}
        trackColor={theme.surfaceContainer}
        label={`${progressPct}%`}
        labelFontSize={11}
      />
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.onSurface }]}>
          {t('dogs.list.todayGoal')}
        </Text>
        <Text
          style={[styles.subtitle, { color: theme.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      {onPress ? (
        <Text style={[styles.chevron, { color: theme.textDisabled }]}>›</Text>
      ) : null}
    </>
  );

  return (
    <GroupedCard elevated>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dogs.list.todayGoal')}
          onPress={onPress}
          style={styles.row}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
    </GroupedCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.step12,
    padding: 14,
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.headline,
    fontWeight: '600',
    fontSize: 15,
  },
  subtitle: {
    ...typography.footnote,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    marginLeft: spacing.xs,
  },
});
