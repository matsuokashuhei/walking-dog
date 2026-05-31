import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { RingProgress } from '@/components/ui/RingProgress';

interface WalkingGoalCardProps {
  todayKm: number;
  goalKm: number;
  progressPct: number;
  subtitle: string;
  onPress?: () => void;
}

export function WalkingGoalCard({
  todayKm,
  goalKm,
  progressPct,
  subtitle,
  onPress,
}: WalkingGoalCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

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
          accessibilityValue={{ min: 0, max: goalKm, now: todayKm }}
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
    padding: spacing.step14,
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.subheadline,
    fontWeight: typography.headline.fontWeight,
  },
  subtitle: {
    ...typography.footnote,
    marginTop: spacing.xs / 2,
  },
  chevron: {
    ...typography.title2,
    marginLeft: spacing.xs,
  },
});
