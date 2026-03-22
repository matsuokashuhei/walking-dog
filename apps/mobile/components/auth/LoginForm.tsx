import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        label="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextInput
        label="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <Button
        label="ログイン"
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
      />
      <Button
        label="アカウントを作成"
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
