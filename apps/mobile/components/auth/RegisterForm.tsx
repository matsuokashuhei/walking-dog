import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';

interface RegisterFormProps {
  onSuccess: (email: string, userConfirmed: boolean) => void;
  onLoginPress: () => void;
}

export function RegisterForm({ onSuccess, onLoginPress }: RegisterFormProps) {
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = email.length > 0 && password.length >= 8 && displayName.length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      const result = await signUp(email, password, displayName);
      onSuccess(email, result.userConfirmed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('USER_EXISTS')) {
        setError(t('auth.register.error.userExists'));
      } else if (message.includes('INVALID_PASSWORD')) {
        setError(t('auth.register.error.invalidPassword'));
      } else {
        setError(t('auth.register.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        label={t('auth.register.displayName')}
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        textContentType="name"
      />
      <TextInput
        label={t('auth.register.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextInput
        label={t('auth.register.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        error={password.length > 0 && password.length < 8 ? t('auth.register.passwordError') : undefined}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <Button
        label={t('auth.register.submit')}
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
      />
      <Button
        label={t('auth.register.loginLink')}
        variant="secondary"
        onPress={onLoginPress}
        style={styles.secondaryButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  error: { ...typography.caption, marginBottom: spacing.md, textAlign: 'center' },
  secondaryButton: { marginTop: spacing.sm },
});
