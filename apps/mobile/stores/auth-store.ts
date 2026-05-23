import { create } from 'zustand';
import {
  getToken,
  setToken,
  deleteToken,
} from '@/lib/auth/secure-storage';
import { refreshToken } from '@/lib/auth/api';
import { setAuthToken } from '@/lib/graphql/client';
import { isNetworkError } from '@/lib/graphql/errors';
import { bootstrapAuth } from '@/lib/auth/bootstrap';
import { queryClient } from '@/lib/query-client';
import { useWalkStore } from '@/stores/walk-store';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  networkError: boolean;
  resetSessionState: () => void;
  initialize: () => Promise<void>;
  setAuth: (accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  networkError: false,

  resetSessionState: () => {
    queryClient.clear();
    useWalkStore.getState().reset();
  },

  initialize: async () => {
    set({ isLoading: true, networkError: false });
    try {
      const result = await bootstrapAuth({
        clearAuth: () => get().clearAuth(),
        refreshAuth: () => get().refreshAuth(),
      });

      set({
        accessToken: result.accessToken,
        isAuthenticated: result.isAuthenticated,
        networkError: result.networkError,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setAuth: async (accessToken, refreshToken) => {
    get().resetSessionState();
    await setToken(accessToken, refreshToken);
    setAuthToken(accessToken);
    set({ accessToken, isAuthenticated: true });
  },

  clearAuth: async () => {
    get().resetSessionState();
    await deleteToken();
    setAuthToken(null);
    set({ accessToken: null, isAuthenticated: false, networkError: false });
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
