import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('INVALID_CODE')) {
        setError(t('auth.confirm.error.invalidCode'));
      } else if (message.includes('EXPIRED_CODE')) {
        setError(t('auth.confirm.error.expiredCode'));
      } else {
        setError(t('auth.confirm.error.generic'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {t('auth.confirm.description', { email })}
      </Text>
      <TextInput
        label={t('auth.confirm.code')}
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
        label={t('auth.confirm.submit')}
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
