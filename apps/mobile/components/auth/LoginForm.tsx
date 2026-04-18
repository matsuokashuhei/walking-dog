import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const theme = useColors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = email.length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (
        message.includes('INVALID_CREDENTIALS') ||
        message.includes('AUTH_ERROR') ||
        message.includes('UserNotFoundException') ||
        message.includes('NotAuthorizedException')
      ) {
        setError(t('auth.login.error.invalidCredentials'));
      } else {
        setError(t('auth.login.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    Alert.alert(t('auth.login.forgotPassword'), t('auth.login.comingSoonApple'));
  }

  function handleApple() {
    Alert.alert(t('auth.login.continueWithApple'), t('auth.login.comingSoonApple'));
  }

  return (
    <View style={styles.container}>
      <GroupedCard>
        <TextInput
          label={t('auth.login.email')}
          labelPosition="inline"
          separator
          testID="login-email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextInput
          label={t('auth.login.password')}
          labelPosition="inline"
          testID="login-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />
      </GroupedCard>

      <Pressable
        onPress={handleForgotPassword}
        accessibilityRole="link"
        accessibilityLabel={t('auth.login.forgotPassword')}
        style={styles.forgotWrapper}
      >
        <Text style={[styles.forgotText, { color: theme.interactive }]}>
          {t('auth.login.forgotPassword')}
        </Text>
      </Pressable>

      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}

      <Button
        label={t('auth.login.submit')}
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
      />

      <View style={styles.orRow}>
        <View style={[styles.orLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.orText, { color: theme.onSurfaceVariant }]}>
          {t('auth.login.or')}
        </Text>
        <View style={[styles.orLine, { backgroundColor: theme.border }]} />
      </View>

      <Button
        label={t('auth.login.continueWithApple')}
        variant="apple"
        onPress={handleApple}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: spacing.lg,
  },
  forgotText: {
    ...typography.subheadline,
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    ...typography.footnote,
  },
});
