import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import {
  useChangeEmail,
  useConfirmEmailChange,
} from '@/hooks/use-auth-mutations';
import { useColors } from '@/hooks/use-colors';
import { toAuthError } from '@/lib/auth/errors';
import { spacing, typography } from '@/theme/tokens';

type EmailChangeStep = 'email' | 'code';

export default function ChangeEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { mutateAsync: changeEmail } = useChangeEmail();
  const { mutateAsync: confirmEmailChange } = useConfirmEmailChange();
  const [step, setStep] = useState<EmailChangeStep>('email');
  const [newEmail, setNewEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSendCode = newEmail.trim().length > 0 && !submitting;
  const canConfirm = code.length === 6 && !submitting;

  async function handleSendCode() {
    if (!canSendCode) return;
    const trimmedEmail = newEmail.trim();
    setError('');
    setSubmitting(true);
    try {
      await changeEmail({ newEmail: trimmedEmail });
      setPendingEmail(trimmedEmail);
      setStep('code');
      setCode('');
    } catch (err: unknown) {
      setError(emailChangeErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setError('');
    setSubmitting(true);
    try {
      await confirmEmailChange({ code });
      router.back();
    } catch (err: unknown) {
      setError(emailConfirmationErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('userChangeEmail.title')}
        leftAction={{ label: t('common.action.cancel'), onPress: () => router.back() }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'email' ? (
          <>
            <GroupedCard elevated={false}>
              <TextInput
                label={t('userChangeEmail.newEmail')}
                labelPosition="inline"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                testID="change-email-new-email"
              />
            </GroupedCard>
            {error ? (
              <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
            ) : null}
            <Button
              label={t('userChangeEmail.sendCode')}
              onPress={handleSendCode}
              loading={submitting}
              disabled={!canSendCode}
              style={styles.submit}
            />
          </>
        ) : (
          <>
            <Text style={[styles.status, { color: theme.onSurfaceVariant }]}>
              {t('userChangeEmail.codeSent', { email: pendingEmail })}
            </Text>
            <GroupedCard elevated={false}>
              <TextInput
                label={t('userChangeEmail.verificationCode')}
                labelPosition="inline"
                value={code}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="done"
                testID="change-email-code"
              />
            </GroupedCard>
            {error ? (
              <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
            ) : null}
            <Button
              label={t('userChangeEmail.confirm')}
              onPress={handleConfirm}
              loading={submitting}
              disabled={!canConfirm}
              style={styles.submit}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function emailChangeErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const authError = toAuthError(error);
  if (authError.kind === 'network') return t('auth.error.networkError');
  return t('userChangeEmail.error.generic');
}

function emailConfirmationErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const authError = toAuthError(error);
  if (authError.kind === 'network') return t('auth.error.networkError');
  if (authError.kind === 'code-mismatch') {
    return authError.reason === 'expired'
      ? t('userChangeEmail.error.expiredCode')
      : t('userChangeEmail.error.invalidCode');
  }
  return t('userChangeEmail.error.generic');
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  status: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
