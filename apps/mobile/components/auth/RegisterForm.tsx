import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';

interface RegisterFormProps {
  onSuccess: (email: string) => void;
  onLoginPress: () => void;
}

export function RegisterForm({ onSuccess, onLoginPress }: RegisterFormProps) {
  const { signUp } = useAuth();
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
      await signUp(email, password, displayName);
      onSuccess(email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '登録に失敗しました';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        label="表示名"
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        textContentType="name"
      />
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
        textContentType="newPassword"
        error={password.length > 0 && password.length < 8 ? '8文字以上で入力してください' : undefined}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <Button
        label="アカウントを作成"
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
      />
      <Button
        label="ログインはこちら"
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
