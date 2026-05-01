import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { appleButton } from '@/theme/overrides';
import { colors, components, elevation } from '@/theme/tokens';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'apple';

type ButtonSize = 'default' | 'circle';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const theme = colors[scheme];
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
      backgroundColor: theme.surfaceContainer,
      borderColor: 'transparent',
      textColor: theme.onSurface,
    },
    destructive: {
      backgroundColor: theme.error,
      borderColor: 'transparent',
      textColor: theme.onInteractive,
    },
    success: {
      backgroundColor: theme.success,
      borderColor: 'transparent',
      textColor: theme.onInteractive,
    },
    apple: {
      backgroundColor: appleButton.background[scheme],
      borderColor: 'transparent',
      textColor: appleButton.text[scheme],
    },
  }[variant];

  const sizeStyle = size === 'circle' ? styles.circle : styles.default;
  const labelStyle = size === 'circle' ? styles.labelCircle : styles.label;
  const circleShadow =
    size === 'circle' && variant === 'success' ? elevation.accentButton : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      style={[
        sizeStyle,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          opacity: isDisabled ? 0.4 : 1,
        },
        circleShadow ?? undefined,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <Text style={[labelStyle, { color: variantStyles.textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  default: {
    height: components.button.height,
    borderRadius: components.button.radius,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: components.button.padding,
  },
  circle: {
    width: components.buttonCircle.size,
    height: components.buttonCircle.size,
    borderRadius: components.buttonCircle.radius,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...components.button.fontPrimary,
  },
  labelCircle: {
    fontSize: components.buttonCircle.fontSize,
    fontWeight: components.buttonCircle.fontWeight,
    letterSpacing: components.buttonCircle.letterSpacing,
  },
});
