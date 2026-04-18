import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppMark } from '@/components/auth/AppMark';
import { LoginForm } from '@/components/auth/LoginForm';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <AppMark />
          <Text style={[styles.heading, { color: theme.onSurface }]}>
            {t('auth.login.heading')}
          </Text>
          <Text style={[styles.sub, { color: theme.onSurfaceVariant }]}>
            {t('auth.login.subtitle')}
          </Text>
        </View>
        <LoginForm
          onSuccess={() => {
            // Navigation guard in _layout.tsx handles redirect to (tabs)
          }}
        />
      </View>
      <Pressable
        onPress={() => router.push('/(auth)/register')}
        accessibilityRole="link"
        accessibilityLabel={t('auth.login.createAccountLink')}
        style={styles.footer}
      >
        <Text style={[styles.footerText, { color: theme.onSurfaceVariant }]}>
          {t('auth.login.newHere')}{' '}
          <Text style={[styles.footerLink, { color: theme.interactive }]}>
            {t('auth.login.createAccountLink')}
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.largeTitle,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sub: {
    ...typography.subheadline,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: spacing.md,
  },
  footerText: {
    ...typography.subheadline,
  },
  footerLink: {
    fontWeight: '500',
  },
});
