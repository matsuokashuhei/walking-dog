import { StyleSheet, View, type ViewProps } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { elevation, radius, spacing } from '@/theme/tokens';

type SpacingKey = keyof typeof spacing;

interface GroupedCardProps extends ViewProps {
  /** Optional padding from the spacing scale. Omit so GroupedRow owns vertical spacing. */
  padding?: SpacingKey;
  /** Drop soft card shadow. Defaults to true. */
  elevated?: boolean;
}

export function GroupedCard({
  style,
  padding,
  elevated = true,
  children,
  ...rest
}: GroupedCardProps) {
  const theme = useColors();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: theme.surface },
        elevated ? elevation.low : null,
        padding ? { padding: spacing[padding] } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
});
