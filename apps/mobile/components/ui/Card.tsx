import { View, StyleSheet, type ViewProps } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, spacing, radius } from '@/theme/tokens';

interface CardProps extends ViewProps {
  padding?: keyof typeof spacing;
}

export function Card({ style, padding = 'md', children, ...rest }: CardProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.border + '33', // 20% opacity ghost border
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
