import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputHandle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { components, radius, spacing, typography } from '@/theme/tokens';

interface OneTimePasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (code: string) => void;
  length: number;
  disabled?: boolean;
}

function normalizeOneTimePassword(value: string, length: number): string {
  return value.replace(/[^0-9]/g, '').slice(0, length);
}

export function OneTimePasswordInput({
  value,
  onChange,
  onComplete,
  length,
  disabled = false,
}: OneTimePasswordInputProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const inputRef = useRef<TextInputHandle | null>(null);
  const lastCompletedCodeRef = useRef<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value.length < length) {
      lastCompletedCodeRef.current = null;
    }
  }, [length, value]);

  function handleChangeText(nextValue: string) {
    if (disabled) return;

    const normalized = normalizeOneTimePassword(nextValue, length);
    if (normalized !== value) {
      onChange(normalized);
    }

    if (
      normalized.length === length &&
      lastCompletedCodeRef.current !== normalized
    ) {
      lastCompletedCodeRef.current = normalized;
      onComplete(normalized);
    }
  }

  const activeIndex = Math.min(value.length, Math.max(length - 1, 0));
  const cells = Array.from({ length }, (_, index) => value[index] ?? '');

  return (
    <View style={styles.container}>
      <View
        style={styles.cells}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {cells.map((digit, index) => (
          <View
            key={index}
            testID={`one-time-password-cell-${index}`}
            style={[
              styles.cell,
              {
                backgroundColor: theme.surface,
                borderColor: digit || (isFocused && index === activeIndex)
                  ? theme.interactive
                  : theme.border,
                borderWidth:
                  isFocused && index === activeIndex
                    ? components.oneTimePassword.focusedCellBorderWidth
                    : components.oneTimePassword.cellBorderWidth,
              },
            ]}
          >
            <Text style={[styles.cellText, { color: theme.onSurface }]}>
              {digit}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        caretHidden
        selectionColor="transparent"
        accessibilityLabel={t('auth.oneTimePassword.label')}
        testID="one-time-password-input"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: components.oneTimePassword.cellHeight,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  cells: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: components.oneTimePassword.cellGap,
    zIndex: 1,
  },
  cell: {
    width: components.oneTimePassword.cellWidth,
    height: components.oneTimePassword.cellHeight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    ...typography.title2,
  },
  input: {
    ...typography.title2,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    height: components.oneTimePassword.cellHeight,
    margin: spacing.none,
    padding: spacing.none,
    backgroundColor: 'transparent',
    color: 'transparent',
    textAlign: 'center',
  },
});
