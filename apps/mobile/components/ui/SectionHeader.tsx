import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

interface SectionHeaderProps extends Omit<TextProps, 'children' | 'style'> {
  label: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  label,
  trailing,
  style,
  testID,
  ...rest
}: SectionHeaderProps) {
  const theme = useColors();
  const labelNode = (
    <Text
      testID={testID}
      style={[styles.label, { color: theme.onSurfaceVariant }]}
      {...rest}
    >
      {label}
    </Text>
  );

  if (!trailing) {
    return <View style={[styles.wrapper, style]}>{labelNode}</View>;
  }

  return (
    <View style={[styles.wrapper, styles.row, style]}>
      {labelNode}
      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  trailing: {
    marginLeft: spacing.md,
  },
});
