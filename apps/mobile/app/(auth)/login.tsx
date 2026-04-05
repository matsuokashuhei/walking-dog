import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoginForm } from '@/components/auth/LoginForm';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ThemedText variant="h1">Walking Dog</ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('auth.login.subtitle')}
        </ThemedText>
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
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
