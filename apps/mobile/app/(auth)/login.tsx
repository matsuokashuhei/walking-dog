import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/components/auth/LoginForm';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.hero}>
        {/* 68 px accent-colored app mark — the bright visual anchor per Precise SignIn */}
        <View
          style={[
            styles.mark,
            { backgroundColor: theme.interactive, shadowColor: theme.interactive },
          ]}
        >
          <Text style={styles.markGlyph}>🐾</Text>
        </View>
        <Text style={[styles.heroText, { color: theme.onSurface }]}>
          Welcome back
        </Text>
        <Text style={[styles.subText, { color: theme.onSurfaceVariant }]}>
          {t('auth.login.subtitle', {
            defaultValue: 'Sign in to keep walking with your companion.',
          })}
        </Text>
      </View>
      <LoginForm
        onSuccess={() => {
          // Navigation guard in _layout.tsx handles redirect to (tabs)
        }}
        onRegisterPress={() => router.push('/(auth)/register')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: spacing.xxl,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  markGlyph: {
    fontSize: 36,
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
