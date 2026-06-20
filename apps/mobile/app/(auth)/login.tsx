import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppMark } from '@/components/auth/AppMark';
import { EmailAuthForm } from '@/components/auth/EmailAuthForm';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

// 認証画面はメールOTPフォームだけを担当し、成功後の遷移はルートの認証ガードに任せます。
export default function LoginScreen() {
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
        <EmailAuthForm
          onSuccess={() => {
            // 認証後の遷移は _layout.tsx の NavigationGuard が一元管理します。
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
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
});
