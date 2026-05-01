import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { useAcceptInviteFlow } from '@/hooks/use-accept-invite-flow';
import { Button } from '@/components/ui/Button';

// 招待受け入れ画面は URL の token を検証し、参加処理の状態ごとに表示を切り替えます。
export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const flow = useAcceptInviteFlow(token);
  const bg = { backgroundColor: theme.background };

  if (flow.status === 'loading') {
    // token 検証・受け入れ処理中は、追加操作を出さずに進行中だけを示します。
    return (
      <View style={[styles.container, bg]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.message, { color: theme.onSurfaceVariant }]}>{t('invite.accepting')}</Text>
      </View>
    );
  }

  if (flow.status === 'error') {
    // 招待が無効または通信に失敗した場合は、前の画面へ戻る導線に限定します。
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
    // 参加完了後は犬一覧へ戻し、参加した犬を pack の中で確認できるようにします。
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
      <View style={[styles.iconContainer, { backgroundColor: theme.surfaceContainer }]}>
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
    borderRadius: spacing.step44 - spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heroText: {
    ...typography.title1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  bodyText: { ...typography.body, textAlign: 'center', marginBottom: spacing.xl },
  acceptButton: { width: '100%', marginBottom: spacing.md },
  declineButton: { paddingVertical: spacing.sm, marginBottom: spacing.xl },
  declineText: { ...typography.body },
  message: { ...typography.body, marginTop: spacing.lg },
  successText: { ...typography.title2, textAlign: 'center' },
  errorText: { ...typography.body, textAlign: 'center' },
  button: { marginTop: spacing.lg, minWidth: 200 },
});
