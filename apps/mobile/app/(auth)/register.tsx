import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ConfirmForm } from '@/components/auth/ConfirmForm';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

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
            <Text style={[styles.brandLabel, { color: theme.onSurfaceVariant }]}>
              WALKING DOG
            </Text>
            <Text style={[styles.heroText, { color: theme.onSurface }]}>
              {t('auth.register.title', { defaultValue: 'Create Account' })}
            </Text>
            <Text style={[styles.subText, { color: theme.onSurfaceVariant }]}>
              {t('auth.register.subtitle', { defaultValue: "Join the archive of your dog's journeys." })}
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
              {t('auth.confirm.subtitle', { defaultValue: 'We sent a code to your email. Enter it below to verify your account.' })}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  brandLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  heroText: {
    ...typography.hero,
  },
  subText: {
    ...typography.body,
    marginTop: spacing.sm,
  },
});
