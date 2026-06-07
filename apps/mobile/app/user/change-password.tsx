import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextInput } from '@/components/ui/TextInput';
import { useChangePassword } from '@/hooks/use-auth-mutations';
import { useColors } from '@/hooks/use-colors';
import { toAuthError } from '@/lib/auth/errors';
import { spacing, typography } from '@/theme/tokens';

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { mutateAsync: changePassword } = useChangePassword();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isTooShort =
    newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSave =
    oldPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    !submitting;

  async function handleSave() {
    if (!canSave) return;
    setError('');
    setSubmitting(true);
    try {
      await changePassword({ oldPassword, newPassword });
      router.back();
    } catch (err: unknown) {
      setError(changePasswordErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  const newPasswordError = isTooShort
    ? t('userChangePassword.error.tooShort')
    : undefined;
  const confirmPasswordError = passwordsMismatch
    ? t('userChangePassword.error.mismatch')
    : undefined;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('userChangePassword.title')}
        leftAction={{ label: t('common.action.cancel'), onPress: () => router.back() }}
        rightAction={{
          label: t('common.action.save'),
          onPress: handleSave,
          strong: true,
          disabled: !canSave,
        }}
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
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="next"
            testID="change-password-old"
          />
          <TextInput
            label={t('userChangePassword.newPassword')}
            labelPosition="inline"
            separator
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            passwordRules="minlength: 8;"
            returnKeyType="next"
            error={newPasswordError}
            testID="change-password-new"
          />
          <TextInput
            label={t('userChangePassword.confirmPassword')}
            labelPosition="inline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            returnKeyType="done"
            error={confirmPasswordError}
            testID="change-password-confirm"
          />
        </GroupedCard>
        {error ? (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function changePasswordErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const authError = toAuthError(error);
  switch (authError.kind) {
    case 'invalid-credentials':
      return t('userChangePassword.error.currentPassword');
    case 'invalid-password':
      return t('userChangePassword.error.invalidPassword');
    case 'network':
      return t('auth.error.networkError');
    default:
      return t('userChangePassword.error.generic');
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
