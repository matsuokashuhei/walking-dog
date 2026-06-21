import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { EmailAuthForm } from '@/components/auth/EmailAuthForm';
import { useColors } from '@/hooks/use-colors';
import { typography } from '@/theme/tokens';

// 新規登録画面も既存のメールOTP認証を使い、成功後の遷移は認証ガードに任せます。
export default function SignUpScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const router = useRouter();

  return (
    <AuthScreenLayout
      heading={t('auth.signup.heading')}
      subtitle={t('auth.signup.subtitle')}
      topAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.action.back')}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={[styles.back, { color: theme.interactive }]}>
            {t('common.action.back')}
          </Text>
        </Pressable>
      }
    >
      <EmailAuthForm
        submitLabel={t('auth.signup.submit')}
        supportingText={t('auth.signup.supporting')}
        onSuccess={() => {
          // 認証後の遷移は _layout.tsx の NavigationGuard が一元管理します。
        }}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  back: {
    ...typography.body,
  },
});
