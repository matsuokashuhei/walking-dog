import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/use-colors';
import { toAuthError } from '@/lib/auth/errors';
import { spacing, typography } from '@/theme/tokens';

interface RegisterFormProps {
  onSuccess: (email: string, userConfirmed: boolean) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const theme = useColors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid =
    email.length > 0 && password.length >= 8 && displayName.length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      const result = await signUp(email, password, displayName);
      onSuccess(email, result.userConfirmed);
    } catch (err: unknown) {
      const authError = toAuthError(err);
      switch (authError.kind) {
        case 'user-exists':
          setError(t('auth.register.error.userExists'));
          break;
        case 'invalid-password':
          setError(t('auth.register.error.invalidPassword'));
          break;
        case 'network':
          setError(t('auth.error.networkError'));
          break;
        default:
          setError(t('auth.register.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  }

  function showComingSoon(
    titleKey: 'auth.register.terms' | 'auth.register.privacyPolicy',
  ) {
    Alert.alert(t(titleKey), t('auth.register.comingSoonTerms'));
  }

  const passwordError =
    password.length > 0 && password.length < 8
      ? t('auth.register.passwordError')
      : undefined;

  return (
    <View style={styles.container}>
      <GroupedCard>
        <TextInput
          label={t('auth.register.displayName')}
          labelPosition="inline"
          separator
          testID="register-displayName"
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
          textContentType="name"
        />
        <TextInput
          label={t('auth.register.email')}
          labelPosition="inline"
          separator
          testID="register-email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextInput
          label={t('auth.register.password')}
          labelPosition="inline"
          testID="register-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          error={passwordError}
        />
      </GroupedCard>

      <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
        {t('auth.register.dogProfileHint')}
      </Text>

      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}

      <Button
        label={t('auth.register.submit')}
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
      />

      <Text style={[styles.legal, { color: theme.textDisabled }]}>
        {t('auth.register.agreePrefix')}
        <Text
          onPress={() => showComingSoon('auth.register.terms')}
          style={[styles.legalLink, { color: theme.interactive }]}
        >
          {t('auth.register.terms')}
        </Text>
        {t('auth.register.agreeAnd')}
        <Text
          onPress={() => showComingSoon('auth.register.privacyPolicy')}
          style={[styles.legalLink, { color: theme.interactive }]}
        >
          {t('auth.register.privacyPolicy')}
        </Text>
        {t('auth.register.agreeSuffix')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  hint: {
    ...typography.footnote,
    marginTop: spacing.step10,
    marginBottom: spacing.step20 + spacing.xs / 2,
    paddingHorizontal: spacing.xs,
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  legal: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: typography.footnote.lineHeight,
  },
  legalLink: {
    ...typography.caption,
  },
});
