import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { RingProgress } from '@/components/ui/RingProgress';

interface GoalProgressCardProps {
  title: string;
  subtitle: string;
  progressPct: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function GoalProgressCard({
  title,
  subtitle,
  progressPct,
  onPress,
  style,
  testID,
}: GoalProgressCardProps) {
  const theme = useColors();

  const content = (
    <>
      <RingProgress
        size={spacing.step44}
        strokeWidth={spacing.xs}
        progress={progressPct}
        color={theme.success}
        trackColor={theme.surfaceContainer}
        label={`${progressPct}%`}
        labelFontSize={typography.metricLabel.fontSize}
        accessibilityLabel={title}
      />
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.onSurface }]}>
          {title}
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
    <GroupedCard elevated style={style} testID={testID}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
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
