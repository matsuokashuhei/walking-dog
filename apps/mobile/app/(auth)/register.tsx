import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ConfirmForm } from '@/components/auth/ConfirmForm';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, fontFamily } from '@/theme/tokens';

type Step = 'register' | 'confirm';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('register');
  const [pendingEmail, setPendingEmail] = useState('');

  function handleRegisterSuccess(
    email: string,
    userConfirmed: boolean,
  ) {
    if (userConfirmed) {
      router.replace('/(auth)/login' as never);
    } else {
      setPendingEmail(email);
      setStep('confirm');
    }
  }

  function handleConfirmSuccess() {
    router.replace('/(auth)/login' as never);
  }

  const heading =
    step === 'register'
      ? t('auth.register.heading')
      : t('auth.confirm.heading');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.brandSection}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <MaterialCommunityIcons
                name="paw"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>
              {heading}
            </Text>
          </View>

          {step === 'register' ? (
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onLoginPress={() => router.back()}
            />
          ) : (
            <ConfirmForm
              email={pendingEmail}
              onSuccess={handleConfirmSuccess}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  content: {
    maxWidth: 384,
    width: '100%',
    alignSelf: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: 30,
    fontFamily: fontFamily.bold,
    letterSpacing: -0.5,
  },
});
