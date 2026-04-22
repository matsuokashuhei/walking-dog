import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type Units = 'km' | 'mile';

export const SETTINGS_THEME_KEY = 'settings_theme';
export const SETTINGS_LANGUAGE_KEY = 'settings_language';
export const SETTINGS_UNITS_KEY = 'settings_units';

type StorageValueMap = {
  [SETTINGS_THEME_KEY]: ThemeMode;
  [SETTINGS_LANGUAGE_KEY]: string;
  [SETTINGS_UNITS_KEY]: Units;
};

type StorageKey = keyof StorageValueMap;

export async function getStoredItem<K extends StorageKey>(
  key: K,
): Promise<StorageValueMap[K] | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value as StorageValueMap[K] | null;
  } catch {
    return null;
  }
}

export async function setStoredItem<K extends StorageKey>(
  key: K,
  value: StorageValueMap[K],
): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
