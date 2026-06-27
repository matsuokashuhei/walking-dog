import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { components, spacing, radius, typography, type ColorTokens } from '@/theme/tokens';

type LabelPosition = 'top' | 'inline';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label: string;
  error?: string;
  style?: StyleProp<TextStyle>;
  /**
   * `top` (default) — UPPERCASE caption label above an outlined 52-px field.
   * `inline` — iOS-settings-style row with label on the left and the field on
   * the right, meant to sit inside a `GroupedCard`.
   */
  labelPosition?: LabelPosition;
  /** Inline-only: draw a hairline separator below the row (for stacked GroupedCard rows). */
  separator?: boolean;
}

type TextInputFocusEvent = Parameters<NonNullable<RNTextInputProps['onFocus']>>[0];
type TextInputBlurEvent = Parameters<NonNullable<RNTextInputProps['onBlur']>>[0];

export const TextInput = ({
  label,
  error,
  style,
  labelPosition = 'top',
  separator = false,
  testID,
  onBlur,
  onFocus,
  ...props
}: TextInputProps) => {
  const theme = useColors();
  const { isFocused, handleBlur, handleFocus } = useTextInputFocusHandlers({
    onBlur,
    onFocus,
  });

  return labelPosition === 'inline' ? (
    <InlineTextInput
      error={error}
      inputProps={props}
      isFocused={isFocused}
      label={label}
      onBlur={handleBlur}
      onFocus={handleFocus}
      separator={separator}
      style={style}
      testID={testID}
      theme={theme}
    />
  ) : (
    <TopTextInput
      error={error}
      inputProps={props}
      isFocused={isFocused}
      label={label}
      onBlur={handleBlur}
      onFocus={handleFocus}
      style={style}
      testID={testID}
      theme={theme}
    />
  );
};

interface UseTextInputFocusHandlersProps {
  onBlur?: RNTextInputProps['onBlur'];
  onFocus?: RNTextInputProps['onFocus'];
}

function useTextInputFocusHandlers({
  onBlur,
  onFocus,
}: UseTextInputFocusHandlersProps) {
  const [isFocused, setIsFocused] = useState(false);

  function handleFocus(event: TextInputFocusEvent) {
    setIsFocused(true);
    onFocus?.(event);
  }

  function handleBlur(event: TextInputBlurEvent) {
    setIsFocused(false);
    onBlur?.(event);
  }

  return { isFocused, handleBlur, handleFocus };
}

interface TextInputVariantProps {
  error?: string;
  inputProps: RNTextInputProps;
  isFocused: boolean;
  label: string;
  onBlur: NonNullable<RNTextInputProps['onBlur']>;
  onFocus: NonNullable<RNTextInputProps['onFocus']>;
  style?: StyleProp<TextStyle>;
  testID?: string;
  theme: ColorTokens;
}

interface InlineTextInputProps extends TextInputVariantProps {
  separator: boolean;
}

const InlineTextInput = ({
  error,
  inputProps,
  isFocused,
  label,
  onBlur,
  onFocus,
  separator,
  style,
  testID,
  theme,
}: InlineTextInputProps) => (
  <>
    <View
      testID={testID ? `${testID}-container` : undefined}
      style={[
        inlineStyles.row,
        {
          backgroundColor: isFocused ? theme.surfaceContainer : 'transparent',
          borderColor: isFocused ? theme.interactive : 'transparent',
        },
      ]}
    >
      <Text style={[inlineStyles.label, { color: theme.onSurfaceVariant }]}>
        {label}
      </Text>
      <RNTextInput
        style={[inlineStyles.input, { color: theme.onSurface }, style]}
        placeholderTextColor={theme.onSurfaceVariant}
        accessibilityLabel={label}
        testID={testID}
        onBlur={onBlur}
        onFocus={onFocus}
        {...inputProps}
      />
    </View>
    {separator ? (
      <View
        testID={testID ? `${testID}-separator` : undefined}
        style={[inlineStyles.separator, { backgroundColor: theme.border }]}
      />
    ) : null}
    {error ? (
      <Text style={[inlineStyles.error, { color: theme.error }]}>{error}</Text>
    ) : null}
  </>
);

const TopTextInput = ({
  error,
  inputProps,
  isFocused,
  label,
  onBlur,
  onFocus,
  style,
  testID,
  theme,
}: TextInputVariantProps) => (
  <View style={styles.container}>
    <Text
      style={[styles.label, { color: theme.onSurface }]}
      accessibilityRole="none"
    >
      {label}
    </Text>
    <RNTextInput
      style={[
        styles.input,
        {
          backgroundColor: theme.surface,
          color: theme.onSurface,
          borderColor: inputBorderColor({ error, isFocused, theme }),
        },
        style,
      ]}
      placeholderTextColor={theme.onSurfaceVariant}
      accessibilityLabel={label}
      testID={testID}
      onBlur={onBlur}
      onFocus={onFocus}
      {...inputProps}
    />
    {error ? (
      <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
    ) : null}
  </View>
);

function inputBorderColor({
  error,
  isFocused,
  theme,
}: {
  error?: string;
  isFocused: boolean;
  theme: ColorTokens;
}) {
  if (error) {
    return theme.error;
  }
  return isFocused ? theme.interactive : theme.border;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.metricLabel,
    marginBottom: spacing.sm,
  },
  input: {
    height: components.textInput.height,
    borderWidth: components.textInput.borderWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

const inlineStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: components.row.gap,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.step14,
    minHeight: components.row.minHeight,
    borderWidth: components.textInput.borderWidth,
    borderRadius: radius.lg,
  },
  label: {
    ...typography.subheadline,
    width: components.textInput.inlineLabelWidth,
  },
  input: {
    flex: 1,
    ...typography.body,
    padding: components.textInput.inputPadding,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  error: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
