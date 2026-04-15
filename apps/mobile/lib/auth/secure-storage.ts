import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const MIGRATION_DONE_KEY = 'auth_migration_v1_done';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

const extras = (Constants.expoConfig?.extra ?? {}) as {
  appGroup?: string;
  keychainService?: string;
};

// When running on iOS with the shared keychain extras wired up, all reads and
// writes go through the App Group / keychain service pair so the Widget
// extension can read the same items via SecItemCopyMatching.
const sharedOptions: SecureStore.SecureStoreOptions | undefined =
  Platform.OS === 'ios' && extras.appGroup && extras.keychainService
    ? { accessGroup: extras.appGroup, keychainService: extras.keychainService }
    : undefined;

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key, sharedOptions);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, sharedOptions);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key, sharedOptions);
  },
};

// One-time migration from the app's default keychain scope into the shared
// App Group scope. Tokens stored before this change are invisible to the new
// scope — without migration every user would get logged out on upgrade.
async function migrateLegacyTokensIfNeeded(): Promise<void> {
  if (Platform.OS !== 'ios' || !sharedOptions) return;
  const alreadyMigrated = await SecureStore.getItemAsync(MIGRATION_DONE_KEY, sharedOptions);
  if (alreadyMigrated === '1') return;

  const legacyAccess = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const legacyRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (legacyAccess && legacyRefresh) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacyAccess, sharedOptions);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, legacyRefresh, sharedOptions);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
  await SecureStore.setItemAsync(MIGRATION_DONE_KEY, '1', sharedOptions);
}

export async function setToken(accessToken: string, refreshToken: string): Promise<void> {
  await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getToken(): Promise<StoredTokens | null> {
  await migrateLegacyTokensIfNeeded();
  const accessToken = await storage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function deleteToken(): Promise<void> {
  await storage.deleteItem(ACCESS_TOKEN_KEY);
  await storage.deleteItem(REFRESH_TOKEN_KEY);
}
