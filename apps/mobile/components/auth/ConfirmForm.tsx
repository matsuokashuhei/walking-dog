import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';

interface ConfirmFormProps {
  email: string;
  onSuccess: () => void;
}

const CODE_LENGTH = 6;

export function ConfirmForm({ email, onSuccess }: ConfirmFormProps) {
  const { confirmSignUp } = useAuth();
  const { t } = useTranslation();
  const theme = useColors();

  const [digits, setDigits] = useState<string[]>(new Array<string>(CODE_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(new Array<TextInput | null>(CODE_LENGTH).fill(null));

  const code = digits.join('');
  const isComplete = code.length === CODE_LENGTH && digits.every((d) => d.length === 1);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && digits[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit() {
    if (!isComplete) return;
    setError('');
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('INVALID_CODE')) {
        setError(t('auth.confirm.error.invalidCode'));
      } else if (message.includes('EXPIRED_CODE')) {
        setError(t('auth.confirm.error.expiredCode'));
      } else {
        setError(t('auth.confirm.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
        {t('auth.confirm.description', { email })}
      </Text>

      <View style={styles.codeRow} accessibilityLabel={t('auth.confirm.code')} accessibilityRole="none">
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={[
              styles.codeBox,
              {
                borderColor: focusedIndex === index ? theme.interactive : theme.border,
                backgroundColor: theme.surfaceContainerLowest,
                color: theme.onSurface,
              },
            ]}
            value={digit}
            onChangeText={(value) => handleDigitChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            keyboardType="number-pad"
            maxLength={1}
            textContentType="oneTimeCode"
            accessibilityLabel={t('auth.confirm.digitLabel', { position: index + 1, defaultValue: `Digit ${index + 1}` })}
            accessibilityRole="none"
            autoFocus={index === 0}
          />
        ))}
      </View>

      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}

      <Button
        label={t('auth.confirm.submit')}
        onPress={handleSubmit}
        loading={loading}
        disabled={!isComplete}
      />

      <TouchableOpacity
        style={styles.resendButton}
        accessibilityRole="button"
        accessibilityLabel={t('auth.confirm.resend')}
      >
        <Text style={[styles.resendText, { color: theme.onSurfaceVariant }]}>
          {t('auth.confirm.resend')}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: theme.onSurfaceVariant }]}>
        SECURE VERIFICATION ARCHIVE
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  codeBox: {
    width: 44,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  resendButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  resendText: {
    ...typography.label,
  },
  footer: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
