import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/lib/auth/api';
import type {
  EmailChangeChallenge,
  EmailChangeConfirmation,
  OneTimePasswordChallenge,
  VerifyOneTimePasswordInput,
} from '@/lib/auth/api';

// 認証 API と永続化ストアをつなぎ、画面側へ認証状態と操作を提供します。
export function useAuth() {
  const { isAuthenticated, isLoading, accessToken, setAuth, clearAuth } = useAuthStore();

  async function requestOneTimePassword(email: string): Promise<OneTimePasswordChallenge> {
    return authApi.requestOneTimePassword(email);
  }

  async function verifyOneTimePassword(
    input: VerifyOneTimePasswordInput,
  ): Promise<void> {
    const result = await authApi.verifyOneTimePassword(input);
    await setAuth(result.accessToken, result.refreshToken);
  }

  async function changeEmail(newEmail: string): Promise<EmailChangeChallenge> {
    return authApi.changeEmail(newEmail);
  }

  async function confirmEmailChange(code: string): Promise<EmailChangeConfirmation> {
    return authApi.confirmEmailChange(code);
  }

  async function signOut(): Promise<void> {
    // アクセストークンがある場合だけ、サーバーへサインアウトを通知します。
    if (accessToken) {
      await authApi.signOut(accessToken);
    }
    await clearAuth();
  }

  return {
    isAuthenticated,
    isLoading,
    accessToken,
    requestOneTimePassword,
    verifyOneTimePassword,
    changeEmail,
    confirmEmailChange,
    signOut,
  };
}
