import { StyleSheet, Text, type TextProps } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

interface SectionHeaderProps extends Omit<TextProps, 'children'> {
  label: string;
}

export function SectionHeader({ label, style, testID, ...rest }: SectionHeaderProps) {
  const theme = useColors();
  return (
    <Text
      testID={testID}
      style={[styles.base, { color: theme.onSurfaceVariant }, style]}
      {...rest}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
