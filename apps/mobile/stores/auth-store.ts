import { create } from 'zustand';
import { getToken, setToken, deleteToken } from '@/lib/auth/secure-storage';
import { setAuthToken } from '@/lib/graphql/client';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  setAuth: (idToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const stored = await getToken();
      if (stored) {
        setAuthToken(stored.idToken);
        set({ token: stored.idToken, isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setAuth: async (idToken, refreshToken) => {
    await setToken(idToken, refreshToken);
    setAuthToken(idToken);
    set({ token: idToken, isAuthenticated: true });
  },

  clearAuth: async () => {
    await deleteToken();
    setAuthToken(null);
    set({ token: null, isAuthenticated: false });
  },
}));
