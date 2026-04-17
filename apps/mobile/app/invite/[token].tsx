import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { useAcceptInviteFlow } from '@/hooks/use-accept-invite-flow';
import { Button } from '@/components/ui/Button';

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const flow = useAcceptInviteFlow(token);
  const bg = { backgroundColor: theme.background };

  if (flow.status === 'loading') {
    return (
      <View style={[styles.container, bg]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>{t('invite.accepting')}</Text>
      </View>
    );
  }

  if (flow.status === 'error') {
    return (
      <View style={[styles.container, bg]}>
        <Text style={[styles.errorText, { color: theme.error }]}>
          {t(flow.errorKey ?? 'invite.error.generic')}
        </Text>
        <Button label={t('common.retry')} onPress={() => router.back()} style={styles.button} />
      </View>
    );
  }

  if (flow.status === 'success') {
    return (
      <View style={[styles.container, bg]}>
        <Text style={[styles.successText, { color: theme.onSurface }]}>
          {t('invite.success', { name: flow.dogName })}
        </Text>
        <Button
          label={t('invite.goToDog')}
          onPress={() => router.replace('/(tabs)/dogs')}
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, bg]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.surfaceContainerHigh }]}>
        <Ionicons name="mail" size={36} color={theme.onSurface} />
      </View>
      <Text style={[styles.heroText, { color: theme.onSurface }]}>{t('invite.title')}</Text>
      <Text style={[styles.bodyText, { color: theme.onSurfaceVariant }]}>{t('invite.description')}</Text>
      <Button
        label={t('invite.accept')}
        variant="primary"
        onPress={() => void flow.accept()}
        style={styles.acceptButton}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('invite.decline')}
        onPress={() => router.back()}
        style={styles.declineButton}
        hitSlop={12}
      >
        <Text style={[styles.declineText, { color: theme.onSurfaceVariant }]}>{t('invite.decline')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
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
  bodyText: { ...typography.body, textAlign: 'center', marginBottom: spacing.xl },
  acceptButton: { width: '100%', marginBottom: spacing.md },
  declineButton: { paddingVertical: spacing.sm, marginBottom: spacing.xl },
  declineText: { ...typography.body },
  message: { ...typography.body, marginTop: spacing.lg },
  successText: { ...typography.h2, textAlign: 'center' },
  errorText: { ...typography.body, textAlign: 'center' },
  button: { marginTop: spacing.lg, minWidth: 200 },
});
