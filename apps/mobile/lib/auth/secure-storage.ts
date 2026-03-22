import * as SecureStore from 'expo-secure-store';

const ID_TOKEN_KEY = 'auth_id_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export interface StoredTokens {
  idToken: string;
  refreshToken: string;
}

export async function setToken(idToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ID_TOKEN_KEY, idToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getToken(): Promise<StoredTokens | null> {
  const idToken = await SecureStore.getItemAsync(ID_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!idToken || !refreshToken) return null;
  return { idToken, refreshToken };
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
