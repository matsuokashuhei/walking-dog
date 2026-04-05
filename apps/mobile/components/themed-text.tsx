import { Text, type TextProps } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, typography } from '@/theme/tokens';

export type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'caption' | 'label';

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  secondary?: boolean;
  disabled?: boolean;
}

export function ThemedText({
  style,
  variant = 'body',
  secondary = false,
  disabled = false,
  ...rest
}: ThemedTextProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  const color = disabled
    ? theme.textDisabled
    : secondary
      ? theme.onSurfaceVariant
      : theme.onSurface;

  return (
    <Text
      style={[typography[variant], { color }, style]}
      {...rest}
    />
  );
}
