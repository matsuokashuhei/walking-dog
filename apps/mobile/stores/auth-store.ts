import { create } from 'zustand';
import { getToken, setToken, deleteToken } from '@/lib/auth/secure-storage';
import { refreshToken } from '@/lib/auth/api';
import { setAuthToken } from '@/lib/graphql/client';
import { isNetworkError } from '@/lib/graphql/errors';

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
    const stored = await getToken();
    if (!stored?.refreshToken) return false;

    const MAX_ATTEMPTS = 4;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const result = await refreshToken(stored.refreshToken);
        await setToken(result.accessToken, result.refreshToken);
        setAuthToken(result.accessToken);
        set({ accessToken: result.accessToken, isAuthenticated: true });
        return true;
      } catch (error) {
        if (!isNetworkError(error) || attempt === MAX_ATTEMPTS - 1) {
          return false;
        }
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
    return false;
  },
}));
