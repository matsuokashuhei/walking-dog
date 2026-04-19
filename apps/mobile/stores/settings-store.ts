import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/lib/i18n';

type ThemeMode = 'light' | 'dark' | 'auto';
type Units = 'km' | 'mile';

interface SettingsState {
  theme: ThemeMode;
  language: string;
  units: Units;
  isLoaded: boolean;
  initialize: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  setUnits: (units: Units) => Promise<void>;
}

const THEME_KEY = 'settings_theme';
const LANGUAGE_KEY = 'settings_language';
const UNITS_KEY = 'settings_units';

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'auto',
  language: 'ja',
  units: 'km',
  isLoaded: false,

  initialize: async () => {
    try {
      const [theme, language, units] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(UNITS_KEY),
      ]);
      const lang = language ?? i18n.language;
      if (language) {
        await i18n.changeLanguage(lang);
      }
      set({
        theme: (theme as ThemeMode) ?? 'auto',
        language: lang,
        units: units === 'mile' ? 'mile' : 'km',
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage unavailable
    }
  },

  setLanguage: async (language) => {
    await i18n.changeLanguage(language);
    set({ language });
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // Storage unavailable
    }
  },

  setUnits: async (units) => {
    set({ units });
    try {
      await AsyncStorage.setItem(UNITS_KEY, units);
    } catch {
      // Storage unavailable
    }
  },
}));
