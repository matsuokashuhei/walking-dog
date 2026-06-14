import { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputRef,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { components, radius, spacing, typography } from '@/theme/tokens';

interface OneTimePasswordInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  label: string;
  disabled?: boolean;
  autoFocus?: boolean;
  testID?: string;
}

export function OneTimePasswordInput({
  length,
  value,
  onChange,
  onComplete,
  label,
  disabled = false,
  autoFocus = false,
  testID = 'one-time-password',
}: OneTimePasswordInputProps) {
  const theme = useColors();
  const inputRef = useRef<TextInputRef | null>(null);
  const lastCompletedCodeRef = useRef<string | null>(
    value.length === length ? value : null,
  );

  useEffect(() => {
    if (value.length < length) {
      lastCompletedCodeRef.current = null;
    }
  }, [length, value]);

  function focusInput() {
    inputRef.current?.focus();
  }

  function handleChangeText(nextValue: string) {
    const normalized = nextValue.replace(/\D/g, '').slice(0, length);
    onChange(normalized);

    if (normalized.length < length) {
      lastCompletedCodeRef.current = null;
      return;
    }

    if (lastCompletedCodeRef.current !== normalized) {
      lastCompletedCodeRef.current = normalized;
      onComplete(normalized);
    }
  }

  const characters = Array.from({ length }, (_, index) => value[index] ?? '');

  return (
    <Pressable
      accessibilityRole="none"
      onPress={focusInput}
      disabled={disabled}
      style={styles.container}
      testID={testID}
    >
      <View style={styles.slots}>
        {characters.map((character, index) => (
          <View
            key={index}
            testID="one-time-password-slot"
            style={[
              styles.slot,
              {
                borderColor: character ? theme.interactive : theme.border,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <Text style={[styles.slotText, { color: theme.onSurface }]}>
              {character}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={length}
        onChangeText={handleChangeText}
        style={styles.input}
        textContentType="oneTimeCode"
        value={value}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  slots: {
    flexDirection: 'row',
    gap: spacing.step6,
    justifyContent: 'space-between',
  },
  slot: {
    flex: 1,
    maxWidth: components.textInput.height,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: components.textInput.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {
    ...typography.title2,
  },
  input: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
});
