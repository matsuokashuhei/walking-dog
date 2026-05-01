import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, spacing, typography } from '@/theme/tokens';

export interface EventPillProps {
  label: string;
  emoji: string;
  count: number;
  disabled: boolean;
  onPress: () => void;
  background: string;
  labelColor: string;
  countColor: string;
}

// 単独犬の散歩で、イベント種別ごとの記録ボタンと現在回数を表示します。
export function EventPill({
  label,
  emoji,
  count,
  disabled,
  onPress,
  background,
  labelColor,
  countColor,
}: EventPillProps) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: background, opacity: pressed ? 0.7 : 1 },
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text style={[styles.pillLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.pillCount, { color: countColor }]}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    gap: spacing.step6,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    justifyContent: 'center',
  },
  pillEmoji: { fontSize: spacing.md },
  pillLabel: {
    ...typography.footnote,
    fontWeight: typography.headline.fontWeight,
  },
  pillCount: {
    ...typography.footnote,
    fontWeight: typography.body.fontWeight,
    marginLeft: spacing.xs / 2,
  },
  buttonDisabled: { opacity: 0.4 },
});
