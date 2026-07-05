import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OneTimePasswordInput } from '@/components/auth/OneTimePasswordInput';
import { emailKeyboardType } from '@/components/auth/emailKeyboard';
import { Button } from '@/components/ui/Button';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { GroupedRow } from '@/components/ui/GroupedRow';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { useAuth } from '@/hooks/use-auth';
import { useColors } from '@/hooks/use-colors';
import { useInvalidateUserQueries } from '@/hooks/use-invalidate-user-queries';
import { useMe } from '@/hooks/use-me';
import { toAuthError } from '@/lib/auth/errors';
import { spacing, typography } from '@/theme/tokens';
import type { EmailChangeChallenge } from '@/lib/auth/api';

export default function EmailSettingsScreen() {
  const { t } = useTranslation();
  const { data: me, isLoading, error, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;
  if (error || !me) {
    return (
      <ErrorScreen
        message={t('user.loadError')}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return <EmailSettingsContent currentEmail={me.email} />;
}

function EmailSettingsContent({ currentEmail }: { currentEmail: string }) {
  const { changeEmail, confirmEmailChange } = useAuth();
  const invalidateUserQueries = useInvalidateUserQueries();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();

  const [newEmail, setNewEmail] = useState('');
  const [challenge, setChallenge] = useState<EmailChangeChallenge | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const verifyingCodeRef = useRef<string | null>(null);

  const trimmedNewEmail = newEmail.trim();
  const canRequestCode =
    trimmedNewEmail.length > 0 &&
    trimmedNewEmail.toLowerCase() !== currentEmail.trim().toLowerCase() &&
    !requestLoading;

  async function handleSubmit() {
    if (!canRequestCode) return;

    setError('');
    setRequestLoading(true);
    try {
      const nextChallenge = await changeEmail(trimmedNewEmail);
      setChallenge(nextChallenge);
      setCode('');
      verifyingCodeRef.current = null;
    } catch (err: unknown) {
      const authError = toAuthError(err);
      switch (authError.kind) {
        case 'user-exists':
          setError(t('settings.emailChange.error.emailInUse'));
          break;
        case 'invalid-credentials':
          setError(t('settings.emailChange.error.sessionExpired'));
          break;
        case 'network':
          setError(t('auth.error.networkError'));
          break;
        default:
          setError(t('settings.emailChange.error.sendGeneric'));
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
      await confirmEmailChange(nextCode);
      await invalidateUserQueries();
      router.back();
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
        case 'invalid-credentials':
          setError(t('settings.emailChange.error.sessionExpired'));
          break;
        case 'network':
          setError(t('auth.error.networkError'));
          break;
        default:
          setError(t('settings.emailChange.error.confirmGeneric'));
      }
      setCode('');
      verifyingCodeRef.current = null;
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('settings.emailChange.title')}
        leftAction="back"
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <GroupedCard elevated={false}>
          <GroupedRow
            label={t('settings.emailChange.currentEmail')}
            value={currentEmail}
            separator={false}
            showChevron={false}
          />
        </GroupedCard>

        {challenge ? (
          <View style={styles.otpSection}>
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
            {verifyLoading ? (
              <Text style={[styles.status, { color: theme.onSurfaceVariant }]}>
                {t('auth.oneTimePassword.verifying')}
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <GroupedCard elevated={false}>
              <TextInput
                label={t('settings.emailChange.newEmail')}
                labelPosition="inline"
                testID="email-change-new-email"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType={emailKeyboardType}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
            </GroupedCard>
            <Button
              label={t('settings.emailChange.sendCode')}
              testID="email-change-send-code"
              onPress={handleSubmit}
              loading={requestLoading}
              disabled={!canRequestCode}
            />
          </>
        )}

        {error ? (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  otpSection: {
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
    textAlign: 'center',
  },
});
