import { View, StyleSheet, useColorScheme, type ViewProps } from 'react-native';
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
          backgroundColor: theme.surface,
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
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
