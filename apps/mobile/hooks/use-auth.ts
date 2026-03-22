import { useAuthStore } from '@/stores/auth-store';
import * as cognito from '@/lib/auth/cognito';

export function useAuth() {
  const { isAuthenticated, isLoading, token, setAuth, clearAuth } = useAuthStore();

  async function signIn(email: string, password: string): Promise<void> {
    const result = await cognito.signIn(email, password);
    await setAuth(result.idToken, result.refreshToken);
  }

  async function signUp(email: string, password: string, displayName: string): Promise<void> {
    await cognito.signUp(email, password, displayName);
  }

  async function confirmSignUp(email: string, code: string): Promise<void> {
    await cognito.confirmSignUp(email, code);
  }

  async function signOut(): Promise<void> {
    cognito.signOut();
    await clearAuth();
  }

  return { isAuthenticated, isLoading, token, signIn, signUp, confirmSignUp, signOut };
}
