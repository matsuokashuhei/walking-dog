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
import { components, spacing, radius, typography } from '@/theme/tokens';

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

export function TextInput({
  label,
  error,
  style,
  labelPosition = 'top',
  separator = false,
  testID,
  ...props
}: TextInputProps) {
  const theme = useColors();

  if (labelPosition === 'inline') {
    return (
      <>
        <View style={inlineStyles.row}>
          <Text style={[inlineStyles.label, { color: theme.onSurfaceVariant }]}>
            {label}
          </Text>
          <RNTextInput
            style={[inlineStyles.input, { color: theme.onSurface }, style]}
            placeholderTextColor={theme.onSurfaceVariant}
            accessibilityLabel={label}
            testID={testID}
            {...props}
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
  }

  return (
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
            borderColor: error ? theme.error : theme.border,
          },
          style,
        ]}
        placeholderTextColor={theme.onSurfaceVariant}
        accessibilityLabel={label}
        testID={testID}
        {...props}
      />
      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}
    </View>
  );
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
