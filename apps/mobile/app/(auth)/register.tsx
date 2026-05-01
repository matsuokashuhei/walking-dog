import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ConfirmForm } from '@/components/auth/ConfirmForm';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

type Step = 'register' | 'confirm';

// 登録画面はアカウント作成と確認コード入力の 2 ステップを同じ route 内で切り替えます。
export default function RegisterScreen() {
  const router = useRouter();
  const theme = useColors();

  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('register');
  const [pendingEmail, setPendingEmail] = useState('');

  // サインアップ結果に応じて、確認済みならログインへ、未確認なら確認ステップへ進めます。
  function handleRegisterSuccess(email: string, userConfirmed: boolean) {
    if (userConfirmed) {
      router.replace('/(auth)/login');
    } else {
      setPendingEmail(email);
      setStep('confirm');
    }
  }

  function handleConfirmSuccess() {
    router.replace('/(auth)/login');
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* 現在の登録ステップに合わせて、入力フォームと確認コードフォームを切り替えます。 */}
      {step === 'register' ? (
        <>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="link"
            accessibilityLabel={t('auth.register.back')}
            style={styles.back}
            hitSlop={12}
          >
            <Text style={[styles.backText, { color: theme.interactive }]}>
              ‹ {t('auth.register.back')}
            </Text>
          </Pressable>
          <View style={styles.hero}>
            <Text style={[styles.heroText, { color: theme.onSurface }]}>
              {t('auth.register.title', { defaultValue: "Let's meet\nyour dog." })}
            </Text>
            <Text style={[styles.subText, { color: theme.onSurfaceVariant }]}>
              {t('auth.register.subtitle')}
            </Text>
          </View>
          <RegisterForm onSuccess={handleRegisterSuccess} />
        </>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={[styles.heroText, { color: theme.onSurface }]}>
              {t('auth.confirm.title', { defaultValue: 'Check your email' })}
            </Text>
            <Text style={[styles.subText, { color: theme.onSurfaceVariant }]}>
              {t('auth.confirm.subtitle', {
                defaultValue:
                  'We sent a code to your email. Enter it below to verify your account.',
              })}
            </Text>
          </View>
          <ConfirmForm email={pendingEmail} onSuccess={handleConfirmSuccess} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.step60,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroText: {
    ...typography.largeTitle,
    marginBottom: spacing.xs,
  },
  subText: {
    ...typography.subheadline,
  },
});
