import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="link"
        accessibilityLabel={t('auth.register.back')}
        style={styles.back}
        hitSlop={spacing.step12}
      >
        <Text style={[styles.backText, { color: theme.interactive }]}>
          {'<'} {t('auth.register.back')}
        </Text>
      </Pressable>
      <PasswordResetForm onComplete={() => router.replace('/(auth)/login')} />
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
    marginBottom: spacing.xl,
  },
  backText: {
    ...typography.body,
  },
});
