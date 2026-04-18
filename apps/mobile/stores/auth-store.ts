import { create } from 'zustand';
import {
  getToken,
  setToken,
  deleteToken,
  migrateLegacyTokens,
} from '@/lib/auth/secure-storage';
import { refreshToken } from '@/lib/auth/api';
import {
  setAuthToken,
  authenticatedRequest,
  setRefreshHandler,
} from '@/lib/graphql/client';
import { isNetworkError } from '@/lib/graphql/errors';
import { ME_QUERY } from '@/lib/graphql/queries/me';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  networkError: boolean;
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

  initialize: async () => {
    set({ isLoading: true, networkError: false });
    // Wire refresh middleware before any network call so 401s get retried.
    setRefreshHandler(() => get().refreshAuth());
    try {
      // Must run before the first getToken(): legacy tokens live in the
      // default keychain scope and are invisible to the shared App Group.
      await migrateLegacyTokens();
      const stored = await getToken();
      if (!stored) return;

      setAuthToken(stored.accessToken);
      try {
        await authenticatedRequest(ME_QUERY);
        // Re-read token in case authenticatedRequest triggered a refresh
        const current = await getToken();
        set({
          accessToken: current?.accessToken ?? stored.accessToken,
          isAuthenticated: true,
        });
      } catch (error) {
        if (isNetworkError(error)) {
          set({ networkError: true });
        } else {
          try {
            await get().clearAuth();
          } catch {
            // Force in-memory state clean even if storage failed
            setAuthToken(null);
            set({ accessToken: null, isAuthenticated: false });
          }
        }
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
