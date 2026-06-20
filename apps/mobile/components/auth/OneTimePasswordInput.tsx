import { useEffect, useRef } from 'react';
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
  disabled?: boolean;
}

function normalizeOneTimePassword(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, components.oneTimePassword.length);
}

export function OneTimePasswordInput({
  value,
  onChange,
  onComplete,
  disabled = false,
}: OneTimePasswordInputProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const inputRef = useRef<TextInputHandle | null>(null);
  const lastCompletedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (value.length < components.oneTimePassword.length) {
      lastCompletedCodeRef.current = null;
    }
  }, [value]);

  function handleChangeText(nextValue: string) {
    if (disabled) return;

    const normalized = normalizeOneTimePassword(nextValue);
    if (normalized !== value) {
      onChange(normalized);
    }

    if (
      normalized.length === components.oneTimePassword.length &&
      lastCompletedCodeRef.current !== normalized
    ) {
      lastCompletedCodeRef.current = normalized;
      onComplete(normalized);
    }
  }

  const cells = Array.from(
    { length: components.oneTimePassword.length },
    (_, index) => value[index] ?? '',
  );

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
            testID={digit ? undefined : 'one-time-password-empty-cell'}
            style={[
              styles.cell,
              {
                backgroundColor: theme.surface,
                borderColor: digit ? theme.interactive : theme.border,
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
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={components.oneTimePassword.length}
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
    borderWidth: components.oneTimePassword.cellBorderWidth,
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
