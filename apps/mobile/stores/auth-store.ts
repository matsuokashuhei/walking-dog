import { create } from 'zustand';
import { getToken, setToken, deleteToken } from '@/lib/auth/secure-storage';
import { setAuthToken } from '@/lib/graphql/client';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  setAuth: (accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const stored = await getToken();
      if (stored) {
        setAuthToken(stored.accessToken);
        set({ accessToken: stored.accessToken, isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setAuth: async (accessToken, refreshToken) => {
    await setToken(accessToken, refreshToken);
    setAuthToken(accessToken);
    set({ accessToken, isAuthenticated: true });
  },

  clearAuth: async () => {
    await deleteToken();
    setAuthToken(null);
    set({ accessToken: null, isAuthenticated: false });
  },

  refreshAuth: async () => {
    const { refreshToken } = await import('@/lib/auth/api');
    const stored = await getToken();
    if (!stored?.refreshToken) return false;
    try {
      const result = await refreshToken(stored.refreshToken);
      await setToken(result.accessToken, result.refreshToken);
      setAuthToken(result.accessToken);
      set({ accessToken: result.accessToken, isAuthenticated: true });
      return true;
    } catch {
      return false;
    }
  },
}));
