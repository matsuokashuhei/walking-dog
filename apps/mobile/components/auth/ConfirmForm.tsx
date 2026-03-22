import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';

interface ConfirmFormProps {
  email: string;
  onSuccess: () => void;
}

export function ConfirmForm({ email, onSuccess }: ConfirmFormProps) {
  const { confirmSignUp } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      onSuccess();
    } catch {
      setError('確認コードが正しくありません');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {email} に確認コードを送りました
      </Text>
      <TextInput
        label="確認コード"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
      <Button
        label="確認"
        onPress={handleSubmit}
        loading={loading}
        disabled={code.length !== 6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  description: { ...typography.body, marginBottom: spacing.lg, textAlign: 'center' },
  error: { ...typography.caption, marginBottom: spacing.md, textAlign: 'center' },
});
