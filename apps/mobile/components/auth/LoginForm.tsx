import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';

interface LoginFormProps {
  onSuccess: () => void;
  onRegisterPress: () => void;
}

export function LoginForm({ onSuccess, onRegisterPress }: LoginFormProps) {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
      if (message.includes('INVALID_CREDENTIALS') || message.includes('AUTH_ERROR')) {
        setError(t('auth.login.error.invalidCredentials'));
      } else {
        setError(t('auth.login.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        label={t('auth.login.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextInput
        label={t('auth.login.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <Button
        label={t('auth.login.submit')}
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
      />
      <Button
        label={t('auth.login.register')}
        variant="secondary"
        onPress={onRegisterPress}
        style={styles.secondaryButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});
