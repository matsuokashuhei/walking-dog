import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ID_TOKEN_KEY = 'auth_id_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export interface StoredTokens {
  idToken: string;
  refreshToken: string;
}

// Web fallback using localStorage (expo-secure-store is native-only)
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export async function setToken(idToken: string, refreshToken: string): Promise<void> {
  await storage.setItem(ID_TOKEN_KEY, idToken);
  await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getToken(): Promise<StoredTokens | null> {
  const idToken = await storage.getItem(ID_TOKEN_KEY);
  const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
  if (!idToken || !refreshToken) return null;
  return { idToken, refreshToken };
}

export async function deleteToken(): Promise<void> {
  await storage.deleteItem(ID_TOKEN_KEY);
  await storage.deleteItem(REFRESH_TOKEN_KEY);
}
