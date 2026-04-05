import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { useAuthStore } from '@/stores/auth-store';
import { useAcceptInvitation } from '@/hooks/use-accept-invitation';
import { extractGraphQLErrorMessage } from '@/lib/graphql/errors';
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

function mapInviteErrorMessage(
  errorMsg: string | null,
  t: (key: string) => string,
): string {
  if (errorMsg) {
    const lower = errorMsg.toLowerCase();
    if (lower.includes('expired')) return t('invite.error.expired');
    if (lower.includes('already been used')) return t('invite.error.alreadyUsed');
    if (lower.includes('already a member')) return t('invite.error.alreadyMember');
  }
  return t('invite.error.generic');
}

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const acceptInvitation = useAcceptInvitation();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dogName, setDogName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    if (!isAuthenticated) {
      savePendingInviteToken(token)
        .then(() => {
          router.replace('/(auth)/login' as never);
        })
        .catch(() => {
          setErrorMessage(t('invite.error.saveFailed'));
          setStatus('error');
        });
      return;
    }

    setStatus('loading');
    acceptInvitation
      .mutateAsync(token)
      .then((dog) => {
        setDogName(dog.name);
        setStatus('success');
      })
      .catch((error: unknown) => {
        const msg = extractGraphQLErrorMessage(error);
        setErrorMessage(mapInviteErrorMessage(msg, t));
        setStatus('error');
      });
  }, [token, isAuthenticated]);

  if (status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>
          {t('invite.accepting')}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>
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

  if (status === 'success') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.successText, { color: theme.onSurface }]}>
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

  // idle — invitation landing screen
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.surfaceContainerHigh }]}>
        <Ionicons name="mail" size={36} color={theme.onSurface} />
      </View>

      <Text style={[styles.heroText, { color: theme.onSurface }]}>
        {t('invite.title')}
      </Text>

      <Text style={[styles.bodyText, { color: theme.onSurfaceVariant }]}>
        {t('invite.description')}
      </Text>

      <Button
        label={t('invite.accept')}
        variant="primary"
        onPress={() => {
          setStatus('loading');
          if (!token) return;
          acceptInvitation
            .mutateAsync(token)
            .then((dog) => {
              setDogName(dog.name);
              setStatus('success');
            })
            .catch((error: unknown) => {
              const msg = extractGraphQLErrorMessage(error);
              setErrorMessage(mapInviteErrorMessage(msg, t));
              setStatus('error');
            });
        }}
        style={styles.acceptButton}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('invite.decline')}
        onPress={() => router.back()}
        style={styles.declineButton}
        hitSlop={12}
      >
        <Text style={[styles.declineText, { color: theme.onSurfaceVariant }]}>
          {t('invite.decline')}
        </Text>
      </Pressable>

      {token ? (
        <Text style={[styles.codeFooter, { color: theme.textDisabled }]}>
          {`INVITATION CODE: ${token}`}
        </Text>
      ) : null}
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heroText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.56,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  bodyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  acceptButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  declineButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  declineText: {
    ...typography.body,
  },
  codeFooter: {
    ...typography.label,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  message: { ...typography.body, marginTop: spacing.lg },
  successText: { ...typography.h2, textAlign: 'center' },
  errorText: { ...typography.body, textAlign: 'center' },
  button: { marginTop: spacing.lg, minWidth: 200 },
});
