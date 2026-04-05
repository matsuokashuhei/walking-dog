import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, radius, typography } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: {
      backgroundColor: theme.interactive,
      borderColor: 'transparent',
      textColor: theme.onInteractive,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: theme.interactive,
      textColor: theme.interactive,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.onSurfaceVariant,
    },
    destructive: {
      backgroundColor: theme.error,
      borderColor: 'transparent',
      textColor: theme.onInteractive,
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          opacity: isDisabled ? 0.4 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: variantStyles.textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.button,
  },
});
