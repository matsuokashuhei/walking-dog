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
    gap: 6,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    justifyContent: 'center',
  },
  pillEmoji: { fontSize: 16 },
  pillLabel: {
    ...typography.footnote,
    fontWeight: '600',
  },
  pillCount: {
    ...typography.footnote,
    fontWeight: '400',
    marginLeft: 2,
  },
  buttonDisabled: { opacity: 0.4 },
});
