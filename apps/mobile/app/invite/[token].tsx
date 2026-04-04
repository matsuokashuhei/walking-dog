import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';
import { useAcceptInvitation } from '@/hooks/use-accept-invitation';
import { Button } from '@/components/ui/Button';

const PENDING_INVITE_KEY = 'pending_invite_token';

export async function savePendingInviteToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PENDING_INVITE_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(PENDING_INVITE_KEY, token);
}

export async function getPendingInviteToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(PENDING_INVITE_KEY)
      : null;
  }
  return SecureStore.getItemAsync(PENDING_INVITE_KEY);
}

export async function deletePendingInviteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(PENDING_INVITE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
}

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const acceptInvitation = useAcceptInvitation();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [dogName, setDogName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    if (!isAuthenticated) {
      savePendingInviteToken(token).then(() => {
        router.replace('/(auth)/login' as never);
      });
      return;
    }

    acceptInvitation
      .mutateAsync(token)
      .then((dog) => {
        setDogName(dog.name);
        setStatus('success');
      })
      .catch(() => {
        setErrorMessage(t('invite.error.generic'));
        setStatus('error');
      });
  }, [token, isAuthenticated]);

  if (status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {t('invite.accepting')}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errorMessage}
        </Text>
        <Button
          label={t('common.retry')}
          onPress={() => router.back()}
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.successText, { color: colors.text }]}>
        {t('invite.success', { name: dogName })}
      </Text>
      <Button
        label={t('invite.goToDog')}
        onPress={() => router.replace('/(tabs)/dogs' as never)}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: { ...typography.body, marginTop: spacing.lg },
  successText: { ...typography.h2, textAlign: 'center' },
  errorText: { ...typography.body, textAlign: 'center' },
  button: { marginTop: spacing.lg, minWidth: 200 },
});
