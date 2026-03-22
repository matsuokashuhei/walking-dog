import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/lib/auth/api';
import type { SignUpResult } from '@/lib/auth/api';

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

  async function signOut(): Promise<void> {
    if (accessToken) {
      await authApi.signOut(accessToken);
    }
    await clearAuth();
  }

  return { isAuthenticated, isLoading, accessToken, signIn, signUp, confirmSignUp, signOut };
}
