import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/components/auth/LoginForm';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.heroText, { color: theme.onSurface }]}>
          Welcome back
        </Text>
        <Text style={[styles.subText, { color: theme.onSurfaceVariant }]}>
          {t('auth.login.subtitle', { defaultValue: 'Sign in to access your companions\' archive.' })}
        </Text>
      </View>
      <LoginForm
        onSuccess={() => {
          // Navigation guard in _layout.tsx handles redirect to (tabs)
        }}
        onRegisterPress={() => router.push('/(auth)/register' as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroText: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  subText: {
    ...typography.body,
    marginTop: spacing.sm,
  },
});
