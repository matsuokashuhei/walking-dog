import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/lib/auth/api';
import type { RequestOneTimePasswordResult } from '@/lib/auth/api';

// 認証 API と永続化ストアをつなぎ、画面側へ認証状態と操作を提供します。
export function useAuth() {
  const { isAuthenticated, isLoading, accessToken, setAuth, clearAuth } = useAuthStore();

  async function requestOneTimePassword(
    email: string,
  ): Promise<RequestOneTimePasswordResult> {
    return authApi.requestOneTimePassword(email);
  }

  async function verifyOneTimePassword(
    challengeId: string,
    code: string,
  ): Promise<void> {
    const result = await authApi.verifyOneTimePassword(challengeId, code);
    await setAuth(result.accessToken, result.refreshToken);
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
    signOut,
  };
}
