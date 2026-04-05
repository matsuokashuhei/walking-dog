import { StyleSheet, Text, TextInput as RNTextInput, View, type TextInputProps as RNTextInputProps, type StyleProp, type TextStyle } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label: string;
  error?: string;
  style?: StyleProp<TextStyle>;
}

export function TextInput({ label, error, style, ...props }: TextInputProps) {
  const theme = useColors();

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
            backgroundColor: theme.surfaceContainerLowest,
            color: theme.onSurface,
            borderColor: error ? theme.error : theme.border,
          },
          style,
        ]}
        placeholderTextColor={theme.onSurfaceVariant}
        accessibilityLabel={label}
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
    ...typography.label,
    marginBottom: spacing.sm,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
