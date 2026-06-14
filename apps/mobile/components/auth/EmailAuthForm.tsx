import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { TextInput } from '@/components/ui/TextInput';
import { OneTimePasswordInput } from './OneTimePasswordInput';
import { useColors } from '@/hooks/use-colors';
import { toAuthError } from '@/lib/auth/errors';
import { spacing, typography } from '@/theme/tokens';

interface EmailAuthFormProps {
  onSuccess: () => void;
}

type Step = 'email' | 'code';

export function EmailAuthForm({ onSuccess }: EmailAuthFormProps) {
  const { requestOneTimePassword, verifyOneTimePassword } = useAuth();
  const { t } = useTranslation();
  const theme = useColors();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  async function handleRequestCode() {
    if (!email || requestLoading) return;
    setError('');
    setRequestLoading(true);
    try {
      const result = await requestOneTimePassword(email);
      setChallengeId(result.challengeId);
      setCode('');
      setStep('code');
    } catch (err: unknown) {
      const authError = toAuthError(err);
      setError(
        authError.kind === 'network'
          ? t('auth.error.networkError')
          : t('auth.oneTimePassword.error.request'),
      );
    } finally {
      setRequestLoading(false);
    }
  }

  async function handleVerify(nextCode: string) {
    if (!challengeId || verifyLoading) return;
    setError('');
    setVerifyLoading(true);
    try {
      await verifyOneTimePassword(challengeId, nextCode);
      onSuccess();
    } catch (err: unknown) {
      const authError = toAuthError(err);
      switch (authError.kind) {
        case 'code-mismatch':
          setError(
            authError.reason === 'expired'
              ? t('auth.oneTimePassword.error.expiredCode')
              : t('auth.oneTimePassword.error.invalidCode'),
          );
          setCode('');
          break;
        case 'network':
          setError(t('auth.error.networkError'));
          break;
        default:
          setError(t('auth.oneTimePassword.error.verify'));
      }
    } finally {
      setVerifyLoading(false);
    }
  }

  if (step === 'code') {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.onSurface }]}>
          {t('auth.oneTimePassword.checkEmailTitle')}
        </Text>
        <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
          {t('auth.oneTimePassword.checkEmailDescription', { email })}
        </Text>

        <OneTimePasswordInput
          length={6}
          value={code}
          onChange={setCode}
          onComplete={handleVerify}
          label={t('auth.oneTimePassword.label')}
          disabled={verifyLoading}
          autoFocus
        />

        {error ? (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}

        <Button
          label={t('auth.oneTimePassword.submit')}
          onPress={() => handleVerify(code)}
          loading={verifyLoading}
          disabled={code.length !== 6}
          style={styles.submit}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GroupedCard>
        <TextInput
          label={t('auth.login.email')}
          labelPosition="inline"
          testID="auth-email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleRequestCode}
        />
      </GroupedCard>

      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}

      <Button
        label={t('auth.oneTimePassword.continueWithEmail')}
        testID="auth-continue-email"
        onPress={handleRequestCode}
        loading={requestLoading}
        disabled={!email}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    ...typography.title1,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.subheadline,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  submit: {
    marginTop: spacing.lg,
  },
});
