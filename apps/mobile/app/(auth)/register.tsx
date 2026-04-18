import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ConfirmForm } from '@/components/auth/ConfirmForm';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

type Step = 'register' | 'confirm';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useColors();

  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('register');
  const [pendingEmail, setPendingEmail] = useState('');

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
      {step === 'register' ? (
        <>
          <View style={styles.hero}>
            <Text style={[styles.heroText, { color: theme.onSurface }]}>
              {t('auth.register.title', { defaultValue: "Let's meet\nyour dog." })}
            </Text>
            <Text style={[styles.subText, { color: theme.onSurfaceVariant }]}>
              {t('auth.register.subtitle', {
                defaultValue:
                  "A few quick details and you'll be walking in a minute.",
              })}
            </Text>
          </View>
          <RegisterForm
            onSuccess={handleRegisterSuccess}
            onLoginPress={() => router.back()}
          />
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
    paddingHorizontal: 32,
    paddingTop: spacing.xxl,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroText: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 8,
  },
  subText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
  },
});
