import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/use-colors';
import { useOtpInput } from '@/hooks/use-otp-input';
import { toAuthError } from '@/lib/auth/errors';
import { isValidPassword, PASSWORD_RULES_DESCRIPTOR } from '@/lib/auth/password-policy';
import { components, radius, spacing, typography } from '@/theme/tokens';

interface PasswordResetFormProps {
  onComplete: () => void;
}

type Step = 'request' | 'confirm' | 'done';

const CODE_LENGTH = 6;

export function PasswordResetForm({ onComplete }: PasswordResetFormProps) {
  const { forgotPassword, confirmForgotPassword } = useAuth();
  const { t } = useTranslation();
  const theme = useColors();

  const otp = useOtpInput(CODE_LENGTH);
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const canRequestCode = email.length > 0;
  const canReset =
    otp.isComplete &&
    isValidPassword(newPassword) &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  async function handleRequestCode() {
    if (!canRequestCode) return;
    setError('');
    setRequestLoading(true);
    try {
      await forgotPassword(email);
      setStep('confirm');
    } catch (err: unknown) {
      const authError = toAuthError(err);
      setError(
        authError.kind === 'network'
          ? t('auth.error.networkError')
          : t('auth.reset.error.request'),
      );
    } finally {
      setRequestLoading(false);
    }
  }

  async function handleResendCode() {
    if (!canRequestCode) return;
    setError('');
    setRequestLoading(true);
    try {
      await forgotPassword(email);
      otp.reset();
    } catch (err: unknown) {
      const authError = toAuthError(err);
      setError(
        authError.kind === 'network'
          ? t('auth.error.networkError')
          : t('auth.reset.error.request'),
      );
    } finally {
      setRequestLoading(false);
    }
  }

  async function handleConfirmReset() {
    if (!canReset) return;
    if (newPassword !== confirmPassword) {
      setError(t('auth.reset.error.passwordMismatch'));
      return;
    }

    setError('');
    setConfirmLoading(true);
    try {
      await confirmForgotPassword(email, otp.code, newPassword);
      setStep('done');
    } catch (err: unknown) {
      const authError = toAuthError(err);
      switch (authError.kind) {
        case 'code-mismatch':
          setError(
            authError.reason === 'expired'
              ? t('auth.reset.error.expiredCode')
              : t('auth.reset.error.invalidCode'),
          );
          break;
        case 'invalid-password':
          setError(t('auth.reset.error.invalidPassword'));
          break;
        case 'network':
          setError(t('auth.error.networkError'));
          break;
        default:
          setError(t('auth.reset.error.generic'));
      }
    } finally {
      setConfirmLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <View style={styles.container}>
        <Text style={[styles.statusLabel, { color: theme.onSurfaceVariant }]}>
          {t('auth.reset.secureRecovery')}
        </Text>
        <Text style={[styles.title, { color: theme.onSurface }]}>
          {t('auth.reset.doneTitle')}
        </Text>
        <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
          {t('auth.reset.doneDescription')}
        </Text>
        <Button label={t('auth.reset.backToSignIn')} onPress={onComplete} />
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <View style={styles.container}>
        <Text style={[styles.statusLabel, { color: theme.onSurfaceVariant }]}>
          {t('auth.reset.secureRecovery')}
        </Text>
        <Text style={[styles.title, { color: theme.onSurface }]}>
          {t('auth.reset.confirmTitle')}
        </Text>
        <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
          {t('auth.reset.confirmDescription', { email })}
        </Text>

        <View style={styles.codeRow} accessibilityLabel={t('auth.reset.code')}>
          {otp.digits.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={otp.setInputRef(index)}
              style={[
                styles.codeBox,
                {
                  borderColor:
                    otp.focusedIndex === index ? theme.interactive : theme.border,
                  backgroundColor: theme.surface,
                  color: theme.onSurface,
                },
              ]}
              value={digit}
              onChangeText={(value) => otp.setDigit(index, value)}
              onKeyPress={({ nativeEvent }) =>
                otp.handleKeyPress(index, nativeEvent.key)
              }
              onFocus={() => otp.setFocusedIndex(index)}
              onBlur={() => otp.setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={1}
              textContentType="oneTimeCode"
              accessibilityLabel={t('auth.reset.digitLabel', {
                position: index + 1,
              })}
              accessibilityRole="none"
              autoFocus={index === 0}
            />
          ))}
        </View>

        <GroupedCard>
          <TextInput
            label={t('auth.reset.newPassword')}
            labelPosition="inline"
            separator
            testID="reset-new-password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            textContentType="newPassword"
            passwordRules={PASSWORD_RULES_DESCRIPTOR}
            autoComplete="password-new"
          />
          <TextInput
            label={t('auth.reset.confirmPassword')}
            labelPosition="inline"
            testID="reset-confirm-password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            passwordRules={PASSWORD_RULES_DESCRIPTOR}
            autoComplete="password-new"
          />
        </GroupedCard>

        <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
          {t('auth.reset.passwordHint')}
        </Text>

        {error ? (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}

        <Button
          label={t('auth.reset.submit')}
          onPress={handleConfirmReset}
          loading={confirmLoading}
          disabled={!canReset}
        />

        <Pressable
          onPress={handleResendCode}
          accessibilityRole="button"
          accessibilityLabel={t('auth.reset.resend')}
          disabled={requestLoading}
          style={styles.resendButton}
        >
          <Text style={[styles.resendText, { color: theme.onSurfaceVariant }]}>
            {t('auth.reset.resend')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.statusLabel, { color: theme.onSurfaceVariant }]}>
        {t('auth.reset.secureRecovery')}
      </Text>
      <Text style={[styles.title, { color: theme.onSurface }]}>
        {t('auth.reset.requestTitle')}
      </Text>
      <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
        {t('auth.reset.requestDescription')}
      </Text>

      <GroupedCard>
        <TextInput
          label={t('auth.reset.email')}
          labelPosition="inline"
          testID="reset-email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
      </GroupedCard>

      <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
        {t('auth.reset.emailHint')}
      </Text>

      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}

      <Button
        label={t('auth.reset.sendCode')}
        onPress={handleRequestCode}
        loading={requestLoading}
        disabled={!canRequestCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  statusLabel: {
    ...typography.metricLabel,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title1,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.subheadline,
    marginBottom: spacing.lg,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.step6,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  codeBox: {
    flex: 1,
    maxWidth: components.textInput.height,
    height: components.textInput.height,
    borderRadius: radius.md,
    borderWidth: components.textInput.borderWidth,
    textAlign: 'center',
    ...typography.title2,
  },
  hint: {
    ...typography.footnote,
    marginTop: spacing.step10,
    marginBottom: spacing.step20,
    paddingHorizontal: spacing.xs,
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
    ...typography.metricLabel,
  },
});
