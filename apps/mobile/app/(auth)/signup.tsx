import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { EmailAuthForm } from '@/components/auth/EmailAuthForm';
import { BackButton } from '@/components/ui/BackButton';

// 新規登録画面も既存のメールOTP認証を使い、成功後の遷移は認証ガードに任せます。
export default function SignUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(auth)/login');
  };

  return (
    <AuthScreenLayout
      heading={t('auth.signup.heading')}
      subtitle={t('auth.signup.subtitle')}
      topAction={<BackButton onPress={handleBack} />}
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
