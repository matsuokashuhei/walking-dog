import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { EmailAuthForm } from '@/components/auth/EmailAuthForm';
import { useColors } from '@/hooks/use-colors';
import { components, spacing, typography } from '@/theme/tokens';

// 認証画面はメールOTPフォームだけを担当し、成功後の遷移はルートの認証ガードに任せます。
export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const router = useRouter();

  return (
    <AuthScreenLayout
      heading={t('auth.login.heading')}
      subtitle={t('auth.login.subtitle')}
      showAppMark
      footer={
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.onSurfaceVariant }]}>
            {t('auth.login.signupPrompt')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.login.signupAction')}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={[styles.footerLink, { color: theme.interactive }]}>
              {t('auth.login.signupAction')}
            </Text>
          </Pressable>
        </View>
      }
    >
      <EmailAuthForm
        submitLabel={t('auth.login.primaryAction')}
        onSuccess={() => {
          // 認証後の遷移は _layout.tsx の NavigationGuard が一元管理します。
        }}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerText: {
    ...typography.footnote,
  },
  footerLink: {
    ...typography.footnote,
    fontWeight: components.button.fontGhost.fontWeight,
  },
});
