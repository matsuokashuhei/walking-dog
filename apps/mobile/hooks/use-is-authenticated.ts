import { useAuthStore } from '@/stores/auth-store';

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.isAuthenticated);
}
