import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { useAuth } from '@/hooks/use-auth';
import { useColors } from '@/hooks/use-colors';
import { toAuthError } from '@/lib/auth/errors';
import { isValidPassword, PASSWORD_RULES_DESCRIPTOR } from '@/lib/auth/password-policy';
import { spacing, typography } from '@/theme/tokens';

const isE2EBuild = process.env.EXPO_PUBLIC_E2E === '1';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useColors();
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    currentPassword.length > 0 &&
    isValidPassword(newPassword) &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    if (newPassword !== confirmPassword) {
      setError(t('userChangePassword.error.passwordMismatch'));
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      const authError = toAuthError(err);
      switch (authError.kind) {
        case 'invalid-credentials':
          setError(t('userChangePassword.error.currentPassword'));
          break;
        case 'invalid-password':
          setError(t('userChangePassword.error.invalidPassword'));
          break;
        case 'network':
          setError(t('auth.error.networkError'));
          break;
        default:
          setError(t('userChangePassword.error.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('userChangePassword.title')}
        leftAction="back"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <GroupedCard elevated={false}>
          <TextInput
            label={t('userChangePassword.currentPassword')}
            labelPosition="inline"
            separator
            testID="change-password-current"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!isE2EBuild}
            textContentType={isE2EBuild ? 'none' : 'password'}
            autoComplete={isE2EBuild ? 'off' : 'current-password'}
          />
          <TextInput
            label={t('userChangePassword.newPassword')}
            labelPosition="inline"
            separator
            testID="change-password-new"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!isE2EBuild}
            textContentType={isE2EBuild ? 'none' : 'newPassword'}
            passwordRules={isE2EBuild ? undefined : PASSWORD_RULES_DESCRIPTOR}
            autoComplete={isE2EBuild ? 'off' : 'password-new'}
          />
          <TextInput
            label={t('userChangePassword.confirmPassword')}
            labelPosition="inline"
            testID="change-password-confirm"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!isE2EBuild}
            textContentType={isE2EBuild ? 'none' : 'newPassword'}
            passwordRules={isE2EBuild ? undefined : PASSWORD_RULES_DESCRIPTOR}
            autoComplete={isE2EBuild ? 'off' : 'password-new'}
          />
        </GroupedCard>

        <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
          {t('userChangePassword.passwordHint')}
        </Text>

        {error ? (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}

        <Button
          label={t('userChangePassword.submit')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
          testID="change-password-submit"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
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
});
