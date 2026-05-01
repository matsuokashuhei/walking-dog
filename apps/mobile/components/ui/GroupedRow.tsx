import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { components, spacing, typography } from '@/theme/tokens';

interface GroupedRowProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  value?: string;
  /** Element rendered inside a 30×30 rounded tile on the leading edge. */
  leading?: ReactNode;
  /** Draw a 0.5 px separator under this row. Set `false` on the last row of a card. */
  separator?: boolean;
  /** Insets applied to the separator so it starts after the leading tile. */
  separatorInset?: number;
  /** Force chevron visibility. Defaults to pressable rows only. */
  showChevron?: boolean;
  style?: ViewStyle;
}

export function GroupedRow({
  label,
  value,
  leading,
  separator = true,
  separatorInset = components.iconTile.size + spacing.md + spacing.step12,
  showChevron,
  onPress,
  style,
  ...rest
}: GroupedRowProps) {
  const theme = useColors();
  const isPressable = typeof onPress === 'function';
  const Container = isPressable ? Pressable : View;
  const renderChevron = showChevron ?? isPressable;

  return (
    <>
      <Container
        accessibilityRole={isPressable ? 'button' : undefined}
        accessibilityLabel={isPressable ? label : undefined}
        onPress={onPress}
        style={[styles.row, style]}
        {...(isPressable ? rest : {})}
      >
        {leading ? (
          <View style={[styles.leading, { backgroundColor: theme.surfaceContainer }]}>
            {leading}
          </View>
        ) : null}
        <Text style={[styles.label, { color: theme.onSurface }]} numberOfLines={1}>
          {label}
        </Text>
        {value ? (
          <Text style={[styles.value, { color: theme.onSurfaceVariant }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {renderChevron ? (
          <Text style={[styles.chevron, { color: theme.textDisabled }]}>›</Text>
        ) : null}
      </Container>
      {separator ? (
        <View
          style={[
            styles.separator,
            {
              backgroundColor: theme.border,
              marginLeft: leading ? separatorInset : spacing.lg,
            },
          ]}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: components.row.gap,
    paddingHorizontal: components.row.paddingH,
    paddingVertical: components.row.paddingV,
    minHeight: components.row.minHeight,
  },
  leading: {
    width: components.iconTile.size,
    height: components.iconTile.size,
    borderRadius: components.iconTile.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.body,
    flex: 1,
  },
  value: {
    ...typography.subheadline,
  },
  chevron: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
