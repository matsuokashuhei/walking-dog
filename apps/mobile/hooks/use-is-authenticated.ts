import { useAuthStore } from '@/stores/auth-store';

// 認証済みかどうかだけを購読し、不要な再描画を避けるための軽量フックです。
export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.isAuthenticated);
}
