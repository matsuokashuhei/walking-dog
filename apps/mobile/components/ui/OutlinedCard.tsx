import { View, StyleSheet, type ViewProps } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius } from '@/theme/tokens';

interface OutlinedCardProps extends ViewProps {
  padding?: keyof typeof spacing;
}

export function OutlinedCard({
  style,
  padding = 'md',
  children,
  ...rest
}: OutlinedCardProps) {
  const theme = useColors();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.cardBorder,
          padding: spacing[padding],
        },
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
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
