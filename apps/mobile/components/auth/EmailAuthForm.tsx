import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { OneTimePasswordInput } from '@/components/auth/OneTimePasswordInput';
import { TextInput } from '@/components/ui/TextInput';
import { emailKeyboardType } from '@/components/auth/emailKeyboard';
import { useColors } from '@/hooks/use-colors';
import { toAuthError } from '@/lib/auth/errors';
import type { OneTimePasswordChallenge } from '@/lib/auth/api';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/lib/legal-urls';
import { spacing, typography } from '@/theme/tokens';

interface EmailAuthFormProps {
  onSuccess: () => void;
}

export function EmailAuthForm({ onSuccess }: EmailAuthFormProps) {
  const { requestOneTimePassword, verifyOneTimePassword } = useAuth();
  const { t } = useTranslation();
  const theme = useColors();

  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState<OneTimePasswordChallenge | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const verifyingCodeRef = useRef<string | null>(null);

  const trimmedEmail = email.trim();
  const canRequestCode = trimmedEmail.length > 0;

  async function handleSubmit() {
    if (!canRequestCode) return;
    setError('');
    setRequestLoading(true);
    try {
      const nextChallenge = await requestOneTimePassword(trimmedEmail);
      setChallenge(nextChallenge);
      setCode('');
      verifyingCodeRef.current = null;
    } catch (err: unknown) {
      const authError = toAuthError(err);
      switch (authError.kind) {
        case 'invalid-credentials':
          setError(t('auth.login.error.invalidCredentials'));
          break;
        case 'network':
          setError(t('auth.error.networkError'));
          break;
        default:
          setError(t('auth.login.error.generic'));
      }
    } finally {
      setRequestLoading(false);
    }
  }

  async function handleComplete(nextCode: string) {
    if (!challenge || verifyLoading || verifyingCodeRef.current === nextCode) return;

    verifyingCodeRef.current = nextCode;
    setError('');
    setVerifyLoading(true);
    try {
      await verifyOneTimePassword({
        email: challenge.email,
        session: challenge.session,
        code: nextCode,
      });
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
          break;
        case 'network':
          setError(t('auth.error.networkError'));
          break;
        default:
          setError(t('auth.oneTimePassword.error.generic'));
      }
      setCode('');
      verifyingCodeRef.current = null;
    } finally {
      setVerifyLoading(false);
    }
  }

  function openLegalUrl(url: string) {
    void Linking.openURL(url);
  }

  return (
    <View style={styles.container}>
      {challenge ? (
        <>
          <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
            {t('auth.oneTimePassword.description', {
              count: challenge.codeLength,
              email: challenge.email,
            })}
          </Text>
          <OneTimePasswordInput
            value={code}
            onChange={setCode}
            onComplete={handleComplete}
            length={challenge.codeLength}
            disabled={verifyLoading}
          />
        </>
      ) : (
        <GroupedCard>
          <TextInput
            label={t('auth.login.email')}
            labelPosition="inline"
            testID="auth-email"
            value={email}
            onChangeText={setEmail}
            keyboardType={emailKeyboardType}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
        </GroupedCard>
      )}

      {verifyLoading ? (
        <Text style={[styles.status, { color: theme.onSurfaceVariant }]}>
          {t('auth.oneTimePassword.verifying')}
        </Text>
      ) : null}

      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}

      {!challenge ? (
        <Button
          label={t('auth.login.submit')}
          onPress={handleSubmit}
          loading={requestLoading}
          disabled={!canRequestCode}
        />
      ) : null}

      <Text style={[styles.legal, { color: theme.textDisabled }]}>
        {t('auth.legal.agreePrefix')}
        <Text
          onPress={() => openLegalUrl(TERMS_URL)}
          style={[styles.legalLink, { color: theme.interactive }]}
        >
          {t('auth.legal.terms')}
        </Text>
        {t('auth.legal.agreeAnd')}
        <Text
          onPress={() => openLegalUrl(PRIVACY_POLICY_URL)}
          style={[styles.legalLink, { color: theme.interactive }]}
        >
          {t('auth.legal.privacyPolicy')}
        </Text>
        {t('auth.legal.agreeSuffix')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  description: {
    ...typography.subheadline,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  status: {
    ...typography.caption,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  legal: {
    ...typography.caption,
    lineHeight: typography.footnote.lineHeight,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  legalLink: {
    ...typography.caption,
  },
});
