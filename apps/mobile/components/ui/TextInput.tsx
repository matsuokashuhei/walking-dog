import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography, fontFamily } from '@/theme/tokens';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label: string;
  error?: string;
  style?: StyleProp<TextStyle>;
}

export function TextInput({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.label,
          { color: colors.textSecondary },
        ]}
        accessibilityRole="none"
      >
        {label}
      </Text>
      <RNTextInput
        style={[
          styles.input,
          {
            color: colors.text,
            borderBottomWidth: isFocused ? 2 : 1,
            borderBottomColor: error
              ? colors.error
              : isFocused
                ? colors.primary
                : 'rgba(173,179,176,0.2)',
          },
          style,
        ]}
        placeholderTextColor="rgba(173,179,176,0.5)"
        accessibilityLabel={label}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: spacing.xs,
    fontFamily: fontFamily.semiBold,
  },
  input: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 4,
    ...typography.body,
    fontFamily: fontFamily.regular,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
