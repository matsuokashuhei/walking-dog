import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/lib/auth/api';
import type { SignUpResult } from '@/lib/auth/api';

// 認証 API と永続化ストアをつなぎ、画面側へ認証状態と操作を提供します。
export function useAuth() {
  const { isAuthenticated, isLoading, accessToken, setAuth, clearAuth } = useAuthStore();

  async function signIn(email: string, password: string): Promise<void> {
    const result = await authApi.signIn(email, password);
    await setAuth(result.accessToken, result.refreshToken);
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string
  ): Promise<SignUpResult> {
    return authApi.signUp(email, password, displayName);
  }

  async function confirmSignUp(email: string, code: string): Promise<void> {
    await authApi.confirmSignUp(email, code);
  }

  async function forgotPassword(email: string): Promise<void> {
    await authApi.forgotPassword(email);
  }

  async function confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    await authApi.confirmForgotPassword(email, code, newPassword);
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
    signIn,
    signUp,
    confirmSignUp,
    forgotPassword,
    confirmForgotPassword,
    signOut,
  };
}
